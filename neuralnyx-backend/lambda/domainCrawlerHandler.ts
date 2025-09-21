import { SNSEvent, SNSHandler } from 'aws-lambda';
import { DomainService } from './services/domainService';
import { initializeAWSClients } from './utils/awsClients';
import { MarkdownConverter } from './utils/markdownConverter';
import { chromium } from 'playwright';

interface DomainEvent {
  eventType: string;
  domain: string;
  userId: string;
  timestamp: string;
  data: any;
  previousData?: any;
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
  domain: string;
  pages: PageResult[];
  lighthouseResults?: any;
  crawlTime: string;
  totalPages: number;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log(
    '🚀 Domain crawler handler invoked with SNS event:',
    JSON.stringify(event, null, 2)
  );

  console.log('🔍 Environment variables at handler start:', {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
    LOCALSTACK_ENDPOINT: process.env.LOCALSTACK_ENDPOINT,
  });

  // Initialize AWS clients for LocalStack
  console.log('🔧 Initializing AWS clients...');
  initializeAWSClients();
  console.log('✅ AWS clients initialized');

  for (const record of event.Records) {
    try {
      const domainEvent: DomainEvent = JSON.parse(record.Sns.Message);

      console.log(
        `Processing ${domainEvent.eventType} event for domain: ${domainEvent.domain}`
      );

      // Only process domain creation and updates
      if (['DOMAIN_CREATED'].includes(domainEvent.eventType)) {
        await processDomainCrawl(domainEvent);
      }
    } catch (error) {
      console.error('❌ Failed to process SNS record:', error);
      // Don't throw error to avoid failing the entire batch
    }
  }
};

async function processDomainCrawl(domainEvent: DomainEvent): Promise<void> {
  try {
    const { domain, userId } = domainEvent;

    console.log(`Starting crawl for domain: ${domain}`);

    // Validate domain format
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      console.error(`Invalid domain format: ${domain}`);
      return;
    }

    // Perform the crawl
    const crawlResult = await crawlDomain(domain, 1, false); // maxPages=1, includeLighthouse=false (handled separately)

    // Get S3 bucket name from SSM parameter using initialized clients
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

    // Store crawl results in S3 using initialized clients
    const AWS = require('aws-sdk');
    const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
    const s3 = new AWS.S3({
      ...(isLocalStack && {
        endpoint: 'http://172.18.0.2:4566',
        region: 'us-east-1', // LocalStack uses us-east-1
        s3ForcePathStyle: true,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
      // For AWS Lambda, don't specify region or credentials - let AWS SDK auto-detect
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3BaseKey = `crawl-results/${userId}/${domain}/${timestamp}`;

    const htmlKey = `${s3BaseKey}/content.html`;
    const markdownKey = `${s3BaseKey}/content.md`;

    // Store HTML content (raw HTML from the first page)
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
        // Continue without failing the entire crawl
      }
    }

    // Update domain table with crawl results
    const domainService = new DomainService();
    await domainService.updateDomainWithCrawlResults(userId, domain, {
      s3Bucket: bucketName,
      s3BaseKey: s3BaseKey,
      totalPages: crawlResult.totalPages,
      lighthouseScore: undefined, // Lighthouse handled separately
    });

    // Update domain with markdown results if generated
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
  } catch (error) {
    console.error(
      `❌ Failed to process domain crawl for domain ${domainEvent.domain}:`,
      error
    );
    throw error;
  }
}

async function crawlDomain(
  domain: string,
  maxPages: number,
  includeLighthouse: boolean
): Promise<CrawlResult> {
  const startTime = new Date().toISOString();
  const pages: PageResult[] = [];

  // Only crawl the single page specified (no depth crawling)
  const mainUrl = `https://${domain}`;

  try {
    console.log(`Crawling single page: ${mainUrl}`);
    const pageResult = await crawlPage(mainUrl, domain);
    pages.push(pageResult);
  } catch (error) {
    console.error(`Failed to crawl ${mainUrl}:`, error);
  }

  // Note: Lighthouse auditing is now handled by a separate Lambda function
  console.log(
    'Lighthouse auditing will be handled by separate lighthouseHandler function'
  );

  return {
    domain,
    pages,
    lighthouseResults: null, // No longer handled here
    crawlTime: startTime,
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
