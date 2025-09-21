import { SNSEvent, SNSHandler } from 'aws-lambda';
import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { XMLParser } from 'fast-xml-parser';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface SitemapIndex {
  sitemap: SitemapUrl[];
}

interface Sitemap {
  url: SitemapUrl[];
}

interface SitemapResult {
  domain: string;
  sitemapUrls: string[];
  totalUrls: number;
  lastModified?: string;
  crawlTime: string;
}

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
    '🗺️ Sitemap crawler handler invoked with SNS event:',
    JSON.stringify(event, null, 2)
  );

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
        await processSitemapCrawl(domainEvent);
      }
    } catch (error) {
      console.error('❌ Failed to process SNS record:', error);
      // Don't throw error to avoid failing the entire batch
    }
  }
};

async function processSitemapCrawl(domainEvent: DomainEvent): Promise<void> {
  try {
    const { domain, userId } = domainEvent;

    console.log(`Starting sitemap crawl for domain: ${domain}`);

    const sitemapResult = await crawlDomainSitemap(domain);

    // Store sitemap results in S3 and update database
    await storeSitemapResults(domain, userId, sitemapResult);

    console.log(
      `✅ Sitemap crawl completed for domain: ${domain}, found ${sitemapResult.totalUrls} URLs`
    );
  } catch (error) {
    console.error(
      `❌ Failed to crawl sitemap for domain ${domainEvent.domain}:`,
      error
    );
    throw error;
  }
}

async function storeSitemapResults(
  domain: string,
  userId: string,
  sitemapResult: SitemapResult
): Promise<void> {
  try {
    // Store sitemap results in S3
    const AWS = require('aws-sdk');
    const ssm = new AWS.SSM();
    const bucketParam = await ssm
      .getParameter({
        Name: '/neuralynx/domain-crawler/bucket-name',
      })
      .promise();
    const bucketName = bucketParam.Parameter.Value;

    const s3 = new AWS.S3();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `sitemap-results/${userId}/${domain}/${timestamp}/sitemap.json`;

    await s3
      .putObject({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify(sitemapResult),
        ContentType: 'application/json',
      })
      .promise();

    // Update domain table with sitemap results
    const { DomainService } = await import('./services/domainService');
    const domainService = new DomainService();

    await domainService.updateDomainWithSitemapResults(userId, domain, {
      totalUrls: sitemapResult.totalUrls,
      lastModified: sitemapResult.lastModified,
      s3Key: s3Key,
    });

    console.log(`✅ Sitemap results stored for domain: ${domain}`);
  } catch (error) {
    console.error(
      `❌ Failed to store sitemap results for domain ${domain}:`,
      error
    );
    throw error;
  }
}

/**
 * Discover sitemaps from robots.txt file
 */
async function discoverSitemapFromRobots(domain: string): Promise<string[]> {
  try {
    const robotsContent = await fetchUrl(`https://${domain}/robots.txt`);
    if (robotsContent) {
      const sitemapMatches = robotsContent.match(/^Sitemap:\s*(.+)$/gim);
      if (sitemapMatches) {
        return sitemapMatches.map((match) =>
          match.replace(/^Sitemap:\s*/i, '').trim()
        );
      }
    }
  } catch (error) {
    console.log(
      `Failed to fetch robots.txt for ${domain}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
  return [];
}

/**
 * Check if a URL exists (HEAD request)
 */
async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve) => {
      const req = client.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: (parsedUrl.pathname || '/') + (parsedUrl.search || ''),
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SitemapCrawler/1.0)',
            Accept: 'application/xml, text/xml, */*',
          },
          timeout: 10000,
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch (error) {
    return false;
  }
}

/**
 * Discover all possible sitemaps for a domain
 */
async function discoverAllSitemaps(domain: string): Promise<string[]> {
  const discoveredSitemaps: string[] = [];

  // 1. Check robots.txt first (most reliable)
  const robotsSitemaps = await discoverSitemapFromRobots(domain);
  discoveredSitemaps.push(...robotsSitemaps);

  // 2. Check common sitemap locations
  const commonPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemaps.xml',
    '/sitemap/index.xml',
    '/sitemap/sitemap.xml',
    '/sitemap1.xml',
    '/sitemap2.xml',
    '/sitemap3.xml',
    '/sitemap.xml.gz',
    '/sitemap_index.xml.gz',
    '/sitemap-index.xml.gz',
    '/sitemap/sitemap.xml.gz',
    '/sitemap1.xml.gz',
    '/sitemap2.xml.gz',
    '/sitemap3.xml.gz',
  ];

  // Check common paths in parallel
  const pathChecks = commonPaths.map(async (path) => {
    const sitemapUrl = `https://${domain}${path}`;
    const exists = await checkUrlExists(sitemapUrl);
    return exists ? sitemapUrl : null;
  });

  const pathResults = await Promise.all(pathChecks);
  const validPaths = pathResults.filter((url): url is string => url !== null);
  discoveredSitemaps.push(...validPaths);

  return [...new Set(discoveredSitemaps)]; // Remove duplicates
}

async function crawlDomainSitemap(domain: string): Promise<SitemapResult> {
  const startTime = new Date().toISOString();
  const sitemapUrls: string[] = [];
  let lastModified: string | undefined;

  console.log(`Starting comprehensive sitemap discovery for domain: ${domain}`);

  // Discover all possible sitemaps
  const discoveredSitemaps = await discoverAllSitemaps(domain);

  if (discoveredSitemaps.length === 0) {
    console.log(`No sitemaps found for domain: ${domain}`);
    return {
      domain,
      sitemapUrls: [],
      totalUrls: 0,
      crawlTime: startTime,
    };
  }

  console.log(
    `Found ${discoveredSitemaps.length} sitemap(s) to process:`,
    discoveredSitemaps
  );

  // Process each discovered sitemap in parallel for better performance
  const sitemapProcessingPromises = discoveredSitemaps.map(
    async (sitemapUrl) => {
      try {
        console.log(`Processing sitemap: ${sitemapUrl}`);
        const sitemapContent = await fetchUrl(sitemapUrl);
        if (sitemapContent) {
          const urls = await parseSitemap(sitemapContent, domain);
          const lastMod = extractLastModified(sitemapContent);

          console.log(`Found ${urls.length} URLs in ${sitemapUrl}`);
          return { urls, lastModified: lastMod, sitemapUrl };
        }
        return { urls: [], lastModified: undefined, sitemapUrl };
      } catch (error) {
        console.log(
          `Failed to process sitemap ${sitemapUrl}:`,
          error instanceof Error ? error.message : String(error)
        );
        return { urls: [], lastModified: undefined, sitemapUrl };
      }
    }
  );

  // Wait for all sitemap processing to complete
  const sitemapResults = await Promise.all(sitemapProcessingPromises);

  // Aggregate results
  for (const result of sitemapResults) {
    sitemapUrls.push(...result.urls);
    if (result.lastModified && !lastModified) {
      lastModified = result.lastModified;
    }
  }

  const uniqueUrls = [...new Set(sitemapUrls)]; // Remove duplicates
  console.log(`Total unique URLs found: ${uniqueUrls.length}`);

  return {
    domain,
    sitemapUrls: uniqueUrls,
    totalUrls: uniqueUrls.length,
    lastModified,
    crawlTime: startTime,
  };
}

async function fetchUrl(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: (parsedUrl.pathname || '/') + (parsedUrl.search || ''),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SitemapCrawler/1.0)',
        Accept: 'application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
      },
      timeout: 30000,
    };

    const req = client.request(options, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }

      let data = '';

      // Handle gzip encoding
      if (res.headers['content-encoding'] === 'gzip') {
        const zlib = require('zlib');
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        gunzip.on('data', (chunk: Buffer) => (data += chunk.toString()));
        gunzip.on('end', () => resolve(data));
      } else {
        res.on('data', (chunk: Buffer) => (data += chunk.toString()));
        res.on('end', () => resolve(data));
      }
    });

    req.on('error', (error) => {
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

async function parseSitemap(
  content: string,
  domain: string
): Promise<string[]> {
  const urls: string[] = [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(content);

    // Handle sitemap index (contains multiple sitemaps)
    if (parsed.sitemapindex) {
      const sitemapIndex: SitemapIndex = parsed.sitemapindex;
      if (sitemapIndex.sitemap && Array.isArray(sitemapIndex.sitemap)) {
        for (const sitemap of sitemapIndex.sitemap) {
          if (sitemap.loc) {
            try {
              const subSitemapContent = await fetchUrl(sitemap.loc);
              if (subSitemapContent) {
                const subUrls = await parseSitemap(subSitemapContent, domain);
                urls.push(...subUrls);
              }
            } catch (error) {
              console.log(
                `Failed to fetch sub-sitemap ${sitemap.loc}:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        }
      }
    }

    // Handle regular sitemap (contains URLs)
    if (parsed.urlset) {
      const sitemap: Sitemap = parsed.urlset;
      if (sitemap.url && Array.isArray(sitemap.url)) {
        for (const urlEntry of sitemap.url) {
          if (urlEntry.loc) {
            // Only include URLs from the same domain
            try {
              const urlObj = new URL(urlEntry.loc);
              if (
                urlObj.hostname === domain ||
                urlObj.hostname.endsWith(`.${domain}`)
              ) {
                urls.push(urlEntry.loc);
              }
            } catch (error) {
              // Invalid URL, skip
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse sitemap XML:', error);

    // Fallback: try to extract URLs using regex
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1];
      try {
        const urlObj = new URL(url);
        if (
          urlObj.hostname === domain ||
          urlObj.hostname.endsWith(`.${domain}`)
        ) {
          urls.push(url);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
  }

  return urls;
}

function extractLastModified(content: string): string | undefined {
  try {
    const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/i;
    const match = content.match(lastmodRegex);
    return match ? match[1] : undefined;
  } catch (error) {
    return undefined;
  }
}
