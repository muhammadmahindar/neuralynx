import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
import { getDynamoDB } from '../utils/awsClients';
import { Content } from '../../models/content';
import { tableMap } from '../../models/tableDecorator';
import { ValidationError } from '../utils/httpResponses';

const tableName = tableMap.get(Content)!;

export interface CreateContentRequest {
  domain: string;
  url: string;
  userId: string;
}

export interface GetContentOptions {
  limit?: number;
  offset?: number;
  domain?: string;
}

export interface ContentRecord extends Content {
  domain: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  crawlData?: Content['crawlData'];
  markdownData?: Content['markdownData'];
  lighthouseData?: Content['lighthouseData'];
}

export class ContentService {
  private db: DocumentClient;

  constructor() {
    console.log('🔧 ContentService constructor - getting DynamoDB client...');
    this.db = getDynamoDB();
    console.log('✅ ContentService constructor - DynamoDB client obtained');
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): void {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      throw new ValidationError(
        'url',
        'URL is required and must be a non-empty string',
        url
      );
    }

    try {
      new URL(url);
    } catch (error) {
      throw new ValidationError('url', 'Invalid URL format', url);
    }
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
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash and normalize
      return urlObj.href.replace(/\/$/, '');
    } catch (error) {
      return url.trim();
    }
  }

  /**
   * Check if content already exists for URL
   */
  async contentExists(domain: string, url: string): Promise<boolean> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const normalizedUrl = this.normalizeUrl(url);

      const result = await this.db
        .get({
          TableName: tableName,
          Key: {
            domain: normalizedDomain,
            url: normalizedUrl,
          },
        })
        .promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking content existence:', error);
      throw new Error('Failed to check content existence');
    }
  }

  /**
   * Create or update content record
   */
  async createOrUpdateContent(
    request: CreateContentRequest
  ): Promise<ContentRecord> {
    this.validateDomain(request.domain);
    this.validateUrl(request.url);

    const normalizedDomain = this.normalizeDomain(request.domain);
    const normalizedUrl = this.normalizeUrl(request.url);
    const currentTime = new Date().toISOString();

    const contentRecord: ContentRecord = {
      domain: normalizedDomain,
      url: normalizedUrl,
      userId: request.userId,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    try {
      // Check if content already exists
      const exists = await this.contentExists(normalizedDomain, normalizedUrl);

      if (exists) {
        // Update existing record
        await this.db
          .update({
            TableName: tableName,
            Key: {
              domain: normalizedDomain,
              url: normalizedUrl,
            },
            UpdateExpression: 'SET updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':updatedAt': currentTime,
            },
            ReturnValues: 'ALL_NEW',
          })
          .promise();
      } else {
        // Create new record
        await this.db
          .put({
            TableName: tableName,
            Item: contentRecord,
          })
          .promise();
      }

      console.log(
        'Content record created/updated successfully:',
        contentRecord
      );
      return contentRecord;
    } catch (error: any) {
      console.error('Error creating/updating content:', error);
      throw new Error('Failed to create/update content');
    }
  }

  /**
   * Get content by domain and URL
   */
  async getContent(domain: string, url: string): Promise<ContentRecord | null> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const normalizedUrl = this.normalizeUrl(url);

      const result = await this.db
        .get({
          TableName: tableName,
          Key: {
            domain: normalizedDomain,
            url: normalizedUrl,
          },
        })
        .promise();

      return (result.Item as ContentRecord) || null;
    } catch (error) {
      console.error('Error retrieving content:', error);
      throw new Error('Failed to retrieve content');
    }
  }

  /**
   * Get all content for a domain
   */
  async getContentByDomain(
    domain: string,
    options: GetContentOptions = {}
  ): Promise<ContentRecord[]> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      const queryParams: any = {
        TableName: tableName,
        KeyConditionExpression: '#domain = :domain',
        ExpressionAttributeNames: {
          '#domain': 'domain',
        },
        ExpressionAttributeValues: {
          ':domain': normalizedDomain,
        },
      };

      // Add pagination
      if (options.limit) {
        queryParams.Limit = options.limit;
      }

      const result = await this.db.query(queryParams).promise();
      let content = (result.Items as ContentRecord[]) || [];

      // Apply offset if specified
      if (options.offset && options.offset > 0) {
        content = content.slice(options.offset);
      }

      return content;
    } catch (error) {
      console.error('Error retrieving content by domain:', error);
      throw new Error('Failed to retrieve content by domain');
    }
  }

  /**
   * Update content with crawl data
   */
  async updateCrawlData(
    domain: string,
    url: string,
    crawlData: Content['crawlData'] & { content?: string }
  ): Promise<ContentRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const normalizedUrl = this.normalizeUrl(url);
      const now = new Date().toISOString();

      // Create a copy of crawlData without the large content field
      // The content is already stored in S3, so we don't need to store it in DynamoDB
      const { content, ...crawlDataForDynamoDB } = crawlData;

      const updateExpression =
        'SET crawlData = :crawlData, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':crawlData': crawlDataForDynamoDB,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            domain: normalizedDomain,
            url: normalizedUrl,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      // Return the updated content
      return (await this.getContent(domain, url)) as ContentRecord;
    } catch (error) {
      console.error('Error updating content with crawl data:', error);
      throw new Error('Failed to update content with crawl data');
    }
  }

  /**
   * Get the full HTML content from S3 for a given content record
   */
  async getContentFromS3(domain: string, url: string): Promise<string | null> {
    try {
      const content = await this.getContent(domain, url);
      if (!content?.crawlData?.s3Bucket || !content?.crawlData?.s3Key) {
        return null;
      }

      const s3 = new AWS.S3();
      const result = await s3
        .getObject({
          Bucket: content.crawlData.s3Bucket,
          Key: content.crawlData.s3Key,
        })
        .promise();

      return result.Body?.toString() || null;
    } catch (error) {
      console.error('Error retrieving content from S3:', error);
      return null;
    }
  }

  /**
   * Update content with markdown data
   */
  async updateMarkdownData(
    domain: string,
    url: string,
    markdownData: Content['markdownData']
  ): Promise<ContentRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const normalizedUrl = this.normalizeUrl(url);
      const now = new Date().toISOString();

      const updateExpression =
        'SET markdownData = :markdownData, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':markdownData': markdownData,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            domain: normalizedDomain,
            url: normalizedUrl,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      // Return the updated content
      return (await this.getContent(domain, url)) as ContentRecord;
    } catch (error) {
      console.error('Error updating content with markdown data:', error);
      throw new Error('Failed to update content with markdown data');
    }
  }

  /**
   * Update content with lighthouse data
   */
  async updateLighthouseData(
    domain: string,
    url: string,
    lighthouseData: Content['lighthouseData']
  ): Promise<ContentRecord> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const normalizedUrl = this.normalizeUrl(url);
      const now = new Date().toISOString();

      const updateExpression =
        'SET lighthouseData = :lighthouseData, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':lighthouseData': lighthouseData,
        ':updatedAt': now,
      };

      await this.db
        .update({
          TableName: tableName,
          Key: {
            domain: normalizedDomain,
            url: normalizedUrl,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      // Return the updated content
      return (await this.getContent(domain, url)) as ContentRecord;
    } catch (error) {
      console.error('Error updating content with lighthouse data:', error);
      throw new Error('Failed to update content with lighthouse data');
    }
  }

  /**
   * Delete content
   */
  async deleteContent(domain: string, url: string): Promise<void> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const normalizedUrl = this.normalizeUrl(url);

      await this.db
        .delete({
          TableName: tableName,
          Key: {
            domain: normalizedDomain,
            url: normalizedUrl,
          },
        })
        .promise();

      console.log('Content deleted successfully:', {
        domain: normalizedDomain,
        url: normalizedUrl,
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      throw new Error('Failed to delete content');
    }
  }

  /**
   * Get all content for a user across all domains
   */
  async getUserContent(
    userId: string,
    options: GetContentOptions = {}
  ): Promise<ContentRecord[]> {
    try {
      // Since we don't have a GSI on userId, we'll need to scan
      // In production, consider adding a GSI for better performance
      const scanParams: any = {
        TableName: tableName,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      };

      // Add domain filter if specified
      if (options.domain) {
        const normalizedDomain = this.normalizeDomain(options.domain);
        scanParams.FilterExpression += ' AND #domain = :domain';
        scanParams.ExpressionAttributeNames = {
          '#domain': 'domain',
        };
        scanParams.ExpressionAttributeValues[':domain'] = normalizedDomain;
      }

      // Add pagination
      if (options.limit) {
        scanParams.Limit = options.limit;
      }

      const result = await this.db.scan(scanParams).promise();
      let content = (result.Items as ContentRecord[]) || [];

      // Apply offset if specified
      if (options.offset && options.offset > 0) {
        content = content.slice(options.offset);
      }

      return content;
    } catch (error) {
      console.error('Error retrieving user content:', error);
      throw new Error('Failed to retrieve user content');
    }
  }
}
