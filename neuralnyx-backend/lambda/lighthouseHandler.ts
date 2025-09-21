import { SNSEvent, SNSHandler } from 'aws-lambda';
import { DomainService } from './services/domainService';
import { initializeAWSClients } from './utils/awsClients';
import { S3 } from 'aws-sdk';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

interface DomainEvent {
  eventType: string;
  domain: string;
  userId: string;
  timestamp: string;
  data: any;
  previousData?: any;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log(
    '🚀 Lighthouse handler invoked with SNS event:',
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
      if (
        ['DOMAIN_CREATED', 'DOMAIN_UPDATED'].includes(domainEvent.eventType)
      ) {
        await processLighthouseAudit(domainEvent);
      }
    } catch (error) {
      console.error('❌ Failed to process SNS record:', error);
      // Don't throw error to avoid failing the entire batch
    }
  }
};

async function processLighthouseAudit(domainEvent: DomainEvent): Promise<void> {
  try {
    const { domain, userId } = domainEvent;

    console.log(`Starting Lighthouse audit for domain: ${domain}`);

    const urlToTest = `https://${domain}`;
    console.log(`Starting Lighthouse audit for: ${urlToTest}`);

    // Perform Lighthouse audit
    const lighthouseResult = await performLighthouseAudit(urlToTest);

    if (!lighthouseResult) {
      console.error('Lighthouse audit failed for domain:', domain);
      return;
    }

    // Extract scores from Lighthouse result
    const scores = {
      performance: lighthouseResult.lhr.categories.performance?.score
        ? Math.round(lighthouseResult.lhr.categories.performance.score * 100)
        : null,
      accessibility: lighthouseResult.lhr.categories.accessibility?.score
        ? Math.round(lighthouseResult.lhr.categories.accessibility.score * 100)
        : null,
      bestPractices: lighthouseResult.lhr.categories['best-practices']?.score
        ? Math.round(
            lighthouseResult.lhr.categories['best-practices'].score * 100
          )
        : null,
      seo: lighthouseResult.lhr.categories.seo?.score
        ? Math.round(lighthouseResult.lhr.categories.seo.score * 100)
        : null,
    };

    console.log('Lighthouse scores:', scores);

    // Store raw Lighthouse report in S3
    const lighthouseResults = await storeLighthouseReport(
      domain,
      userId,
      lighthouseResult
    );
    console.log(`Stored Lighthouse report for domain: ${domain}`);

    // Update domain record with lighthouse results
    const domainService = new DomainService();
    await domainService.updateLighthouseResults(
      domain,
      userId,
      lighthouseResults
    );
    console.log(
      `Updated domain record with Lighthouse results for domain: ${domain}`
    );

    console.log(`✅ Lighthouse audit completed for domain: ${domain}`, {
      scores,
      auditTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `❌ Failed to process Lighthouse audit for domain ${domainEvent.domain}:`,
      error
    );
    throw error;
  }
}

async function performLighthouseAudit(urlToTest: string): Promise<any> {
  const startTime = Date.now();

  try {
    console.log(`Starting Lighthouse audit for: ${urlToTest}`);

    // Launch Chrome browser for Lighthouse with debugging port
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
        '--remote-debugging-port=9222',
      ],
    });

    // Wait a moment for the browser to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Configure Lighthouse options
    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: 9222,
      chromeFlags: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    };

    console.log('Running Lighthouse audit...');
    const result = await lighthouse(urlToTest, options);

    await browser.close();

    const endTime = Date.now();
    console.log(`Lighthouse audit completed in ${endTime - startTime}ms`);

    if (!result) {
      throw new Error('Lighthouse audit returned no results');
    }

    return result;
  } catch (error) {
    console.error('Lighthouse audit failed:', error);
    throw error;
  }
}

async function storeLighthouseReport(
  domain: string,
  userId: string,
  lighthouseResult: any
): Promise<any> {
  try {
    const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
    const s3 = new S3({
      ...(isLocalStack && {
        endpoint: 'http://s3.localhost.localstack.cloud:4566',
        region: 'us-east-1', // LocalStack uses us-east-1
        s3ForcePathStyle: true,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
      // For AWS Lambda, don't specify region or credentials - let AWS SDK auto-detect
    });

    // Get bucket name from SSM
    const SSM = require('aws-sdk/clients/ssm');
    const ssm = new SSM({
      ...(isLocalStack && {
        endpoint: 'http://ssm.localhost.localstack.cloud:4566',
        region: 'us-east-1', // LocalStack uses us-east-1
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
      // For AWS Lambda, don't specify region or credentials - let AWS SDK auto-detect
    });

    const bucketParam = await ssm
      .getParameter({
        Name: '/neuralynx/domain-crawler/bucket-name',
      })
      .promise();

    const bucketName = bucketParam.Parameter?.Value;
    if (!bucketName) {
      throw new Error('Bucket name not found in SSM');
    }

    // Create timestamp for the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `lighthouse-results/${userId}/${domain}/${timestamp}/lighthouse-report.json`;

    // Store the raw Lighthouse report
    await s3
      .putObject({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify(lighthouseResult, null, 2),
        ContentType: 'application/json',
      })
      .promise();

    // Generate presigned URL for the report
    const presignedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: s3Key,
      Expires: 60 * 60 * 24 * 7, // 7 days
    });

    console.log(`Lighthouse report stored at: ${s3Key}`);

    return {
      presignedUrl,
    };
  } catch (error) {
    console.error('Error storing Lighthouse report:', error);
    throw error;
  }
}
