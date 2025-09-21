import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpResponse, getAuthenticatedUser } from './utils/httpResponses';
import { DomainService } from './services/domainService';
import { ContentService } from './services/contentService';
import { initializeAWSClients } from './utils/awsClients';
import { MarkdownConverter } from './utils/markdownConverter';
import { chromium } from 'playwright';

interface CrawlRequest {
  url: string;
  maxPages?: number;
  includeLighthouse?: boolean;
}

interface PageResult {
  url: string;
  title: string;
  content: string;
  statusCode: number;
  loadTime: number;
  wordCount: number;
  links: string[];
  images: string[];
  forms: any[];
  buttons: any[];
  inputs: any[];
}

interface CrawlResult {
  url: string;
  domain: string;
  status: string;
  message: string;
  timestamp: string;
  crawlData: {
    totalPages: number;
    pages: PageResult[];
    s3Bucket?: string;
    s3BaseKey?: string;
    presignedUrl?: string;
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Domain Crawler API Event:', JSON.stringify(event, null, 2));

  try {
    // Initialize AWS clients for LocalStack
    console.log('🔧 Initializing AWS clients...');
    initializeAWSClients();
    console.log('✅ AWS clients initialized');

    // Get authenticated user
    const user = await getAuthenticatedUser(event);
    if (!user) {
      return HttpResponse.unauthorized('Authentication required');
    }

    // Parse request body
    let requestBody: CrawlRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return HttpResponse.badRequest('Invalid JSON in request body');
    }

    const { url, maxPages = 1, includeLighthouse = false } = requestBody;

    if (!url) {
      return HttpResponse.badRequest('URL is required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return HttpResponse.badRequest('Invalid URL format');
    }

    // Extract domain from URL
    const domain = new URL(url).hostname;

    // Check if domain exists for user
    const domainService = new DomainService();
    const domainExists = await domainService.domainExists(user.userId, domain);
    if (!domainExists) {
      return HttpResponse.badRequest(
        'Domain not found for this user. Please add the domain first.'
      );
    }

    console.log(`Starting crawl for domain: ${domain}, URL: ${url}`);

    // Perform the actual crawl
    const crawlData = await processDomainCrawl(
      url,
      domain,
      user.userId,
      maxPages,
      includeLighthouse
    );

    const result: CrawlResult = {
      url,
      domain,
      status: 'completed',
      message: 'Crawl completed successfully',
      timestamp: new Date().toISOString(),
      crawlData,
    };

    return HttpResponse.ok(result, 'Crawl completed successfully');
  } catch (error) {
    console.error('Error in domain crawler API handler:', error);
    return HttpResponse.internalServerError('Internal server error');
  }
};

async function processDomainCrawl(
  url: string,
  domain: string,
  userId: string,
  maxPages: number,
  includeLighthouse: boolean
): Promise<CrawlResult['crawlData']> {
  try {
    console.log(`Starting crawl for domain: ${domain}`);

    // Validate domain format
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }

    // Perform the crawl
    const crawlResult = await crawlDomain(
      url,
      domain,
      maxPages,
      includeLighthouse
    );

    // Get S3 bucket name from SSM parameter
    const { getSSM } = await import('./utils/awsClients');
    const ssm = getSSM();
    const bucketParam = await ssm
      .getParameter({
        Name: '/neuralynx/domain-crawler/bucket-name',
      })
      .promise();
    const bucketName = bucketParam.Parameter?.Value;
    if (!bucketName) {
      throw new Error('S3 bucket name not found in SSM parameter');
    }

    // Store crawl results in S3
    const AWS = require('aws-sdk');
    const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
    const s3 = new AWS.S3({
      ...(isLocalStack && {
        endpoint: 'http://172.18.0.2:4566',
        region: 'us-east-1',
        s3ForcePathStyle: true,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3BaseKey = `crawl-results/${userId}/${domain}/${timestamp}`;

    const htmlKey = `${s3BaseKey}/content.html`;
    const markdownKey = `${s3BaseKey}/content.md`;

    // Store HTML content
    const htmlContent =
      crawlResult.pages.length > 0 ? crawlResult.pages[0].content : '';
    await s3
      .putObject({
        Bucket: bucketName,
        Key: htmlKey,
        Body: htmlContent,
        ContentType: 'text/html',
      })
      .promise();

    // Convert HTML to Markdown and store
    let markdownContent = '';
    let markdownMetadata = null;
    if (htmlContent) {
      try {
        const markdownConverter = new MarkdownConverter({
          includeImages: true,
          includeLinks: true,
          includeTables: true,
          headingStyle: 'atx',
        });

        markdownContent = markdownConverter.convertToMarkdown(htmlContent);
        markdownMetadata = markdownConverter.extractMetadata(htmlContent);

        await s3
          .putObject({
            Bucket: bucketName,
            Key: markdownKey,
            Body: markdownContent,
            ContentType: 'text/markdown',
          })
          .promise();

        console.log(`✅ Markdown generated and stored for domain: ${domain}`);
      } catch (error) {
        console.error(
          `❌ Failed to generate markdown for domain ${domain}:`,
          error
        );
      }
    }

    // Generate presigned URL for accessing the crawl results
    const presignedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: htmlKey,
      Expires: 3600, // 1 hour
    });

    // Create or update content record in Content table
    const contentService = new ContentService();
    await contentService.createOrUpdateContent({
      domain,
      url,
      userId,
    });

    // Update content with crawl data
    if (crawlResult.pages.length > 0) {
      const pageData = crawlResult.pages[0];
      await contentService.updateCrawlData(domain, url, {
        title: pageData.title,
        content: pageData.content,
        statusCode: pageData.statusCode,
        loadTime: pageData.loadTime,
        wordCount: pageData.wordCount,
        links: pageData.links,
        images: pageData.images,
        forms: pageData.forms,
        buttons: pageData.buttons,
        inputs: pageData.inputs,
        s3Bucket: bucketName,
        s3Key: htmlKey,
        crawledAt: new Date().toISOString(),
      });
    }

    // Update content with markdown data if generated
    if (markdownContent && markdownMetadata) {
      await contentService.updateMarkdownData(domain, url, {
        content: markdownContent,
        s3Bucket: bucketName,
        s3Key: markdownKey,
        wordCount: markdownMetadata.wordCount,
        generatedAt: new Date().toISOString(),
      });
    }

    // Update domain table with crawl results (for backward compatibility)
    const domainService = new DomainService();
    await domainService.updateDomainWithCrawlResults(userId, domain, {
      s3Bucket: bucketName,
      s3BaseKey: s3BaseKey,
      totalPages: crawlResult.totalPages,
      lighthouseScore: undefined, // Lighthouse handled separately
    });

    // Update domain with markdown results if generated (for backward compatibility)
    if (markdownContent && markdownMetadata) {
      await domainService.updateDomainWithMarkdownResults(userId, domain, {
        s3Key: markdownKey,
        bucket: bucketName,
        wordCount: markdownMetadata.wordCount,
        generatedAt: new Date().toISOString(),
      });
    }

    console.log(
      `✅ Crawl completed for domain: ${domain}, pages: ${crawlResult.totalPages}`
    );

    return {
      totalPages: crawlResult.totalPages,
      pages: crawlResult.pages,
      s3Bucket: bucketName,
      s3BaseKey: s3BaseKey,
      presignedUrl,
    };
  } catch (error) {
    console.error(
      `❌ Failed to process domain crawl for domain ${domain}:`,
      error
    );
    throw error;
  }
}

async function crawlDomain(
  url: string,
  domain: string,
  maxPages: number,
  includeLighthouse: boolean
): Promise<{ pages: PageResult[]; totalPages: number }> {
  const pages: PageResult[] = [];

  try {
    console.log(`Crawling page: ${url}`);
    const pageResult = await crawlPage(url, domain);
    pages.push(pageResult);
  } catch (error) {
    console.error(`Failed to crawl ${url}:`, error);
  }

  // Note: Lighthouse auditing is handled by a separate Lambda function
  if (includeLighthouse) {
    console.log(
      'Lighthouse auditing will be handled by separate lighthouseHandler function'
    );
  }

  return {
    pages,
    totalPages: pages.length,
  };
}

async function crawlPage(url: string, domain: string): Promise<PageResult> {
  const startTime = Date.now();

  try {
    console.log(`Launching browser for: ${url}`);

    // Launch browser with optimized settings for Lambda
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Set timeout for page operations
    page.setDefaultTimeout(30000);

    console.log(`Navigating to: ${url}`);

    // Navigate to the page and wait for it to load
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const statusCode = response?.status() || 0;
    console.log(`Page loaded with status: ${statusCode}`);

    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000);

    // Extract page content and metadata
    const content = await page.content();
    const title = await page.title();

    // Extract links
    const links = await page.$$eval('a[href]', (elements) =>
      elements
        .map((el) => el.href)
        .filter(
          (href) =>
            href && !href.startsWith('#') && !href.startsWith('javascript:')
        )
    );

    // Extract images
    const images = await page.$$eval('img[src]', (elements) =>
      elements.map((el) => el.src).filter((src) => src)
    );

    // Extract forms
    const forms = await page.$$eval('form', (elements) =>
      elements.map((form) => ({
        action: form.action || '',
        method: (form.method || 'GET').toUpperCase(),
      }))
    );

    // Extract buttons
    const buttons = await page.$$eval('button', (elements) =>
      elements.map((button) => ({
        type: button.type || 'button',
        text: button.textContent?.trim() || '',
      }))
    );

    // Extract inputs
    const inputs = await page.$$eval('input', (elements) =>
      elements.map((input) => ({
        type: input.type || 'text',
        name: input.name || '',
        placeholder: input.placeholder || '',
      }))
    );

    // Calculate word count from visible text
    const textContent = await page.textContent('body');
    const wordCount = textContent
      ? textContent.split(/\s+/).filter((word) => word.length > 0).length
      : 0;

    const loadTime = Date.now() - startTime;

    console.log(
      `Crawl completed in ${loadTime}ms. Found ${links.length} links, ${images.length} images, ${forms.length} forms`
    );

    // Close browser
    await browser.close();

    return {
      url,
      title,
      content,
      statusCode,
      loadTime,
      wordCount,
      links,
      images,
      forms,
      buttons,
      inputs,
    };
  } catch (error) {
    console.error(`Failed to crawl ${url}:`, error);
    throw error;
  }
}
