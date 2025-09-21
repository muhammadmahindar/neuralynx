import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpResponse, getAuthenticatedUser } from './utils/httpResponses';
import { ContentService } from './services/contentService';
import { DomainService } from './services/domainService';
import { initializeAWSClients, getS3 } from './utils/awsClients';
import { MarkdownConverter } from './utils/markdownConverter';
import { chromium } from 'playwright';

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
  markdownResults?: {
    wordCount: number;
    generatedAt: string;
    presignedUrl: string;
  };
  sitemapResults?: {
    totalUrls: number;
    presignedUrl: string;
  };
  lighthouseResults?: {
    presignedUrl: string;
  };
}

async function generatePresignedUrl(
  bucket: string,
  key: string
): Promise<string> {
  const s3 = getS3();

  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: 3600, // 1 hour
  });
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Content Handler Event:', JSON.stringify(event, null, 2));

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

    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const queryStringParameters = event.queryStringParameters || {};

    switch (httpMethod) {
      case 'POST':
        // Check if this is the /content endpoint (get content by domain)
        if (event.path === '/content' || event.path === '/api/content') {
          return await handleGetContent(user.userId, event.body);
        }
        // Check if this is the /content/list endpoint
        else if (event.path === '/content/list' || event.path === '/api/content/list') {
          return await handleListContent(user.userId, event.body);
        }
        // Check if this is the /content/delete endpoint
        else if (event.path === '/content/delete' || event.path === '/api/content/delete') {
          return await handleDeleteContent(user.userId, event.body);
        }
        return HttpResponse.badRequest('Invalid POST endpoint');
      default:
        return HttpResponse.methodNotAllowed(['POST']);
    }
  } catch (error) {
    console.error('Error in content handler:', error);
    return HttpResponse.internalServerError('Internal server error');
  }
};

async function handleGetContent(
  userId: string,
  requestBody: string | null
): Promise<APIGatewayProxyResult> {
  const contentService = new ContentService();
  const domainService = new DomainService();

  // Parse request body
  if (!requestBody) {
    return HttpResponse.badRequest('Request body is required');
  }

  let body;
  try {
    body = JSON.parse(requestBody);
  } catch (error) {
    return HttpResponse.badRequest('Invalid JSON in request body');
  }

  // Validate required fields
  if (!body.url) {
    return HttpResponse.badRequest('URL is required in request body');
  }

  const url = body.url;
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Extract domain from URL
  let domain;
  try {
    const urlObj = new URL(fullUrl);
    domain = urlObj.hostname;
  } catch (error) {
    return HttpResponse.badRequest('Invalid URL format');
  }

  // Check if domain exists for user
  const domainExists = await domainService.domainExists(userId, domain);
  if (!domainExists) {
    return HttpResponse.badRequest(
      'Domain not found for this user. Please add the domain first.'
    );
  }

  // Check if we have content for this specific URL
  const content = await contentService.getContent(domain, fullUrl);

  if (content) {
    // Check if user owns the domain (not individual URL)
    // Since we already verified domain ownership above, we can proceed
    // The domain ownership check ensures the user has access to all content under that domain

    // Generate presigned URLs for existing content
    const crawlPresignedUrl = content.crawlData
      ? await generatePresignedUrl(
          content.crawlData.s3Bucket,
          content.crawlData.s3Key
        )
      : '';

    const markdownPresignedUrl = content.markdownData
      ? await generatePresignedUrl(
          content.markdownData.s3Bucket,
          content.markdownData.s3Key
        )
      : '';

    const result = {
      crawlResults: {
        totalPages: 1,
        presignedUrl: crawlPresignedUrl,
      },
      markdownResults: {
        wordCount: content.markdownData?.wordCount || 0,
        generatedAt: content.markdownData?.generatedAt || '',
        presignedUrl: markdownPresignedUrl,
      },
      sitemapResults: {
        totalUrls: 0, // Sitemap data not stored in content table
        presignedUrl: '',
      },
      lighthouseResults: {
        presignedUrl: content.lighthouseData?.reportUrl || '',
      },
    };

    return HttpResponse.ok(result, 'Content retrieved successfully');
  }

  // If no content exists for this URL, start a crawl immediately
  console.log(
    `No content found for URL: ${fullUrl}. Starting immediate crawl...`
  );

  try {
    // Perform the crawl for the specific URL
    const crawlResult = await processDomainCrawl(
      fullUrl,
      domain,
      userId,
      1,
      false
    );

    // Return the simplified crawl results format
    const result = {
      crawlResults: {
        totalPages: crawlResult.crawlData.totalPages,
        presignedUrl: crawlResult.crawlData.presignedUrl,
      },
      markdownResults: {
        wordCount: crawlResult.markdownResults?.wordCount || 0,
        generatedAt:
          crawlResult.markdownResults?.generatedAt ||
          new Date().toISOString(),
        presignedUrl: crawlResult.markdownResults?.presignedUrl || '',
      },
      sitemapResults: {
        totalUrls: crawlResult.sitemapResults?.totalUrls || 0,
        presignedUrl: crawlResult.sitemapResults?.presignedUrl || '',
      },
      lighthouseResults: {
        presignedUrl: '', // Lighthouse results not available in immediate crawl
      },
    };

    return HttpResponse.ok(result, 'Crawl completed successfully');
  } catch (error) {
    console.error(`Failed to crawl URL ${fullUrl}:`, error);
    return HttpResponse.internalServerError('Failed to crawl URL');
  }
}

async function handleDeleteContent(
  userId: string,
  requestBody: string | null
): Promise<APIGatewayProxyResult> {
  // Parse request body
  if (!requestBody) {
    return HttpResponse.badRequest('Request body is required');
  }

  let body;
  try {
    body = JSON.parse(requestBody);
  } catch (error) {
    return HttpResponse.badRequest('Invalid JSON in request body');
  }

  if (!body.domain) {
    return HttpResponse.badRequest('Domain is required in request body');
  }

  const contentService = new ContentService();
  const domain = body.domain;

  // Get all content for the domain and user
  const existingContent = await contentService.getContentByDomain(domain);
  const userContent = existingContent.filter(
    (item) => item.userId === userId
  );

  // Delete each content item
  for (const content of userContent) {
    await contentService.deleteContent(domain, content.url);
  }

  return HttpResponse.ok(
    { message: `Content deleted successfully for domain: ${domain}` },
    'Content deleted successfully'
  );
}

async function handleListContent(
  userId: string,
  requestBody: string | null
): Promise<APIGatewayProxyResult> {
  const contentService = new ContentService();
  const domainService = new DomainService();

  // Parse request body
  if (!requestBody) {
    return HttpResponse.badRequest('Request body is required');
  }

  let body;
  try {
    body = JSON.parse(requestBody);
  } catch (error) {
    return HttpResponse.badRequest('Invalid JSON in request body');
  }

  // Validate required fields
  if (!body.domain) {
    return HttpResponse.badRequest('Domain is required in request body');
  }

  const domain = body.domain;
  const limit = body.limit || 10;
  const offset = body.offset || 0;

  // Check if domain exists for user
  const domainExists = await domainService.domainExists(userId, domain);
  if (!domainExists) {
    return HttpResponse.badRequest(
      'Domain not found for this user. Please add the domain first.'
    );
  }

  // Get content for the domain with pagination
  const allContent = await contentService.getContentByDomain(domain);
  const userContent = allContent.filter((item) => item.userId === userId);

  // Apply pagination
  const totalItems = userContent.length;
  const paginatedContent = userContent.slice(offset, offset + limit);

  // Format the response with pagination metadata
  const result = {
    content: paginatedContent.map((item) => ({
      domain: item.domain,
      url: item.url,
      title: item.crawlData?.title || '',
      wordCount: item.markdownData?.wordCount || 0,
      crawledAt: item.crawlData?.crawledAt || item.createdAt,
      updatedAt: item.updatedAt,
      hasMarkdown: !!item.markdownData,
      hasLighthouse: !!item.lighthouseData,
    })),
    pagination: {
      total: totalItems,
      limit: limit,
      offset: offset,
      hasMore: offset + limit < totalItems,
      nextOffset: offset + limit < totalItems ? offset + limit : null,
    },
  };

  return HttpResponse.ok(result, 'Content list retrieved successfully');
}

async function processDomainCrawl(
  url: string,
  domain: string,
  userId: string,
  maxPages: number,
  includeLighthouse: boolean
): Promise<{
  crawlData: CrawlResult['crawlData'];
  markdownResults?: CrawlResult['markdownResults'];
  sitemapResults?: CrawlResult['sitemapResults'];
  lighthouseResults?: CrawlResult['lighthouseResults'];
}> {
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
    let markdownResults: CrawlResult['markdownResults'] = undefined;

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

        // Generate presigned URL for markdown
        const markdownPresignedUrl = s3.getSignedUrl('getObject', {
          Bucket: bucketName,
          Key: markdownKey,
          Expires: 3600, // 1 hour
        });

        markdownResults = {
          wordCount: markdownMetadata.wordCount,
          generatedAt: new Date().toISOString(),
          presignedUrl: markdownPresignedUrl,
        };

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
      crawlData: {
        totalPages: crawlResult.totalPages,
        pages: crawlResult.pages,
        s3Bucket: bucketName,
        s3BaseKey: s3BaseKey,
        presignedUrl,
      },
      markdownResults,
      sitemapResults: {
        totalUrls: 0,
        presignedUrl: presignedUrl, // Use same URL for now
      },
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
