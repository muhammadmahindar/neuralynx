import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { getDynamoDB } from '../utils/awsClients';
import { Domain } from '../../models/domain';
import { tableMap } from '../../models/tableDecorator';
import { ValidationError } from '../utils/httpResponses';

const tableName = tableMap.get(Domain)!;

export interface CreateDomainRequest {
  userId: string;
  domain: string;
}

export interface GetDomainsOptions {
  limit?: number;
  offset?: number;
  active?: boolean;
  search?: string;
}

export interface DomainRecord extends Domain {
  userId: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  businessSummary?: string;
  lastCrawledAt?: string;
  crawlResults?: {
    s3Bucket: string;
    s3BaseKey: string;
    totalPages: number;
    lighthouseScore?: number;
  };
  sitemapResults?: {
    totalUrls: number;
    lastModified?: string;
    s3Key: string;
  };
  businessAnalysis?: {
    summary: string;
    businessType: string;
    targetAudience: string;
    keyServices: string[];
    industry: string;
    analyzedAt: string;
  };
}

export class DomainService {
  private db: DocumentClient;

  constructor() {
    console.log('🔧 DomainService constructor - getting DynamoDB client...');
    this.db = getDynamoDB();
    console.log('✅ DomainService constructor - DynamoDB client obtained');
  }

  /**
   * Validate domain format
   */
  private validateDomain(domain: string): void {
    if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
      throw new ValidationError(
        'domain',
        'Domain is required and must be a non-empty string',
        domain
      );
    }

    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
    if (!domainRegex.test(domain.trim())) {
      throw new ValidationError('domain', 'Invalid domain format', domain);
    }
  }

  /**
   * Normalize domain name
   */
  private normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase();
  }

  /**
   * Check if domain already exists for user
   */
  async domainExists(userId: string, domain: string): Promise<boolean> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      const result = await this.db
        .get({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
        })
        .promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking domain existence:', error);
      throw new Error('Failed to check domain existence');
    }
  }

  /**
   * Create a new domain for user
   */
  async createDomain(request: CreateDomainRequest): Promise<DomainRecord> {
    this.validateDomain(request.domain);

    const normalizedDomain = this.normalizeDomain(request.domain);
    const currentTime = new Date().toISOString();

    // Check if domain already exists
    const exists = await this.domainExists(request.userId, normalizedDomain);
    if (exists) {
      throw new ValidationError(
        'domain',
        'Domain already exists for this user',
        normalizedDomain
      );
    }

    const domainRecord: DomainRecord = {
      userId: request.userId,
      domain: normalizedDomain,
      createdAt: currentTime,
      updatedAt: currentTime,
      isActive: true,
    };

    try {
      await this.db
        .put({
          TableName: tableName,
          Item: domainRecord,
          ConditionExpression:
            'attribute_not_exists(userId) AND attribute_not_exists(#domain)',
          ExpressionAttributeNames: {
            '#domain': 'domain',
          },
        })
        .promise();

      console.log('Domain created successfully:', domainRecord);
      return domainRecord;
    } catch (error: any) {
      console.error('Error creating domain:', error);

      if (error.code === 'ConditionalCheckFailedException') {
        throw new ValidationError(
          'domain',
          'Domain already exists for this user',
          normalizedDomain
        );
      }

      throw new Error('Failed to create domain');
    }
  }

  /**
   * Get domain by user ID and domain name
   */
  async getDomain(
    userId: string,
    domain: string
  ): Promise<DomainRecord | null> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      const result = await this.db
        .get({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
        })
        .promise();

      return (result.Item as DomainRecord) || null;
    } catch (error) {
      console.error('Error retrieving domain:', error);
      throw new Error('Failed to retrieve domain');
    }
  }

  /**
   * Get all domains for a user with optional filtering and pagination
   */
  async getUserDomains(
    userId: string,
    options: GetDomainsOptions = {}
  ): Promise<DomainRecord[]> {
    try {
      let queryParams: any = {
        TableName: tableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      };

      // Add filter expression if needed
      const filterExpressions: string[] = [];

      if (options.active !== undefined) {
        filterExpressions.push('isActive = :active');
        queryParams.ExpressionAttributeValues[':active'] = options.active;
      }

      if (options.search) {
        filterExpressions.push('contains(domain, :search)');
        queryParams.ExpressionAttributeValues[':search'] =
          options.search.toLowerCase();
      }

      if (filterExpressions.length > 0) {
        queryParams.FilterExpression = filterExpressions.join(' AND ');
      }

      // Add pagination
      if (options.limit) {
        queryParams.Limit = options.limit;
      }

      const result = await this.db.query(queryParams).promise();
      let domains = (result.Items as DomainRecord[]) || [];

      // Apply offset if specified (DynamoDB doesn't support offset directly)
      if (options.offset && options.offset > 0) {
        domains = domains.slice(options.offset);
      }

      return domains;
    } catch (error) {
      console.error('Error retrieving user domains:', error);
      throw new Error('Failed to retrieve user domains');
    }
  }

  /**
   * Delete domain
   */
  async deleteDomain(userId: string, domain: string): Promise<void> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      await this.db
        .delete({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
        })
        .promise();

      console.log('Domain deleted successfully:', {
        userId,
        domain: normalizedDomain,
      });
    } catch (error) {
      console.error('Error deleting domain:', error);
      throw new Error('Failed to delete domain');
    }
  }

  /**
   * Update domain with crawl results
   */
  async updateDomainWithCrawlResults(
    userId: string,
    domain: string,
    crawlResults: {
      s3Bucket: string;
      s3BaseKey: string;
      totalPages: number;
      lighthouseScore?: number;
    }
  ): Promise<DomainRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const now = new Date().toISOString();

      const updateExpression =
        'SET lastCrawledAt = :lastCrawledAt, crawlResults = :crawlResults, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':lastCrawledAt': now,
        ':crawlResults': crawlResults,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      // Return the updated domain
      return (await this.getDomain(userId, domain)) as DomainRecord;
    } catch (error) {
      console.error('Error updating domain with crawl results:', error);
      throw new Error('Failed to update domain with crawl results');
    }
  }

  /**
   * Update domain with sitemap results
   */
  async updateDomainWithSitemapResults(
    userId: string,
    domain: string,
    sitemapResults: {
      totalUrls: number;
      lastModified?: string;
      s3Key: string;
    }
  ): Promise<DomainRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const now = new Date().toISOString();

      const updateExpression =
        'SET sitemapResults = :sitemapResults, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':sitemapResults': sitemapResults,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      // Return the updated domain
      return (await this.getDomain(userId, domain)) as DomainRecord;
    } catch (error) {
      console.error('Error updating domain with sitemap results:', error);
      throw new Error('Failed to update domain with sitemap results');
    }
  }

  /**
   * Update domain with Lighthouse results
   */
  async updateLighthouseResults(
    domain: string,
    userId: string,
    lighthouseResults: {
      presignedUrl: string;
    }
  ): Promise<DomainRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const now = new Date().toISOString();

      const updateExpression =
        'SET lighthouseResults = :lighthouseResults, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':lighthouseResults': lighthouseResults,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      console.log(
        `Updated Lighthouse results for domain: ${domain}`,
        lighthouseResults
      );

      // Return the updated domain
      return (await this.getDomain(userId, domain)) as DomainRecord;
    } catch (error) {
      console.error('Error updating domain with Lighthouse results:', error);
      throw new Error('Failed to update domain with Lighthouse results');
    }
  }

  /**
   * Update domain with Lighthouse scores (legacy method)
   */
  async updateLighthouseScore(
    domain: string,
    scores: {
      performance: number | null;
      accessibility: number | null;
      bestPractices: number | null;
      seo: number | null;
    }
  ): Promise<void> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const now = new Date().toISOString();

      const updateExpression =
        'SET lighthouseScore = :lighthouseScore, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':lighthouseScore': scores,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            userId: 'system', // Use system user for lighthouse updates
            domain: normalizedDomain,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      console.log(`Updated Lighthouse scores for domain: ${domain}`, scores);
    } catch (error) {
      console.error('Error updating domain with Lighthouse scores:', error);
      throw new Error('Failed to update domain with Lighthouse scores');
    }
  }

  /**
   * Update domain business summary
   */
  async updateBusinessSummary(
    userId: string,
    domain: string,
    businessSummary: string
  ): Promise<DomainRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const now = new Date().toISOString();

      // Validate business summary
      if (typeof businessSummary !== 'string') {
        throw new ValidationError(
          'businessSummary',
          'Business summary must be a string',
          businessSummary
        );
      }

      if (businessSummary.length > 5000) {
        throw new ValidationError(
          'businessSummary',
          'Business summary must be 5000 characters or less',
          businessSummary
        );
      }

      const updateExpression =
        'SET businessSummary = :businessSummary, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':businessSummary': businessSummary.trim(),
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            userId: userId,
            domain: normalizedDomain,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      console.log('Domain business summary updated:', {
        userId,
        domain: normalizedDomain,
        businessSummary: businessSummary.trim(),
      });

      // Return the updated domain
      return (await this.getDomain(userId, domain)) as DomainRecord;
    } catch (error) {
      console.error('Error updating domain business summary:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('Failed to update domain business summary');
    }
  }

  /**
   * Update domain with markdown results
   */
  async updateDomainWithMarkdownResults(
    userId: string,
    domain: string,
    markdownResults: {
      s3Key: string;
      bucket: string;
      wordCount: number;
      generatedAt: string;
    }
  ): Promise<void> {
    try {
      // Generate presigned URL for markdown content
      const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
      const s3 = new (await import('aws-sdk')).S3({
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

      const presignedUrl = s3.getSignedUrl('getObject', {
        Bucket: markdownResults.bucket,
        Key: markdownResults.s3Key,
        Expires: 3600, // 1 hour
      });

      await this.db
        .update({
          TableName: tableName,
          Key: {
            userId,
            domain,
          },
          UpdateExpression:
            'SET markdownResults = :markdownResults, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':markdownResults': {
              ...markdownResults,
              presignedUrl,
            },
            ':updatedAt': new Date().toISOString(),
          },
        })
        .promise();

      console.log('Domain updated with markdown results:', {
        userId,
        domain,
        markdownResults,
      });
    } catch (error) {
      console.error('Error updating domain with markdown results:', error);
      throw new Error('Failed to update domain with markdown results');
    }
  }
}
