import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { getDynamoDB } from '../utils/awsClients';
import { Topic } from '../../models/topic';
import { tableMap } from '../../models/tableDecorator';
import { ValidationError } from '../utils/httpResponses';

const tableName = tableMap.get(Topic)!;

export interface CreateTopicRequest {
  id: string;
  domain: string;
  value: string;
  userId: string;
}

export interface UpdateTopicRequest {
  value: string;
}

export interface GetTopicsOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface TopicRecord extends Topic {
  id: string;
  domain: string;
  value: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export class TopicService {
  private db: DocumentClient;

  constructor() {
    console.log('🔧 TopicService constructor - getting DynamoDB client...');
    this.db = getDynamoDB();
    console.log('✅ TopicService constructor - DynamoDB client obtained');
  }

  /**
   * Validate topic data
   */
  private validateTopicData(data: {
    id?: string;
    domain?: string;
    value?: string;
  }): void {
    if (
      data.id !== undefined &&
      (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0)
    ) {
      throw new ValidationError(
        'id',
        'Topic ID is required and must be a non-empty string',
        data.id
      );
    }

    if (
      data.domain !== undefined &&
      (!data.domain ||
        typeof data.domain !== 'string' ||
        data.domain.trim().length === 0)
    ) {
      throw new ValidationError(
        'domain',
        'Domain is required and must be a non-empty string',
        data.domain
      );
    }

    if (
      data.value !== undefined &&
      (!data.value ||
        typeof data.value !== 'string' ||
        data.value.trim().length === 0)
    ) {
      throw new ValidationError(
        'value',
        'Topic value is required and must be a non-empty string',
        data.value
      );
    }
  }

  /**
   * Normalize domain name
   */
  private normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase();
  }

  /**
   * Check if topic already exists
   */
  async topicExists(id: string, domain: string): Promise<boolean> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      const result = await this.db
        .get({
          TableName: tableName,
          Key: {
            id: id,
            domain: normalizedDomain,
          },
        })
        .promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking topic existence:', error);
      throw new Error('Failed to check topic existence');
    }
  }

  /**
   * Create a new topic
   */
  async createTopic(request: CreateTopicRequest): Promise<TopicRecord> {
    this.validateTopicData(request);

    const normalizedDomain = this.normalizeDomain(request.domain);
    const currentTime = new Date().toISOString();

    // Check if topic already exists
    const exists = await this.topicExists(request.id, normalizedDomain);
    if (exists) {
      throw new ValidationError(
        'id',
        'Topic with this ID already exists for this domain',
        request.id
      );
    }

    const topicRecord: TopicRecord = {
      id: request.id,
      domain: normalizedDomain,
      value: request.value.trim(),
      createdAt: currentTime,
      updatedAt: currentTime,
      userId: request.userId,
    };

    try {
      await this.db
        .put({
          TableName: tableName,
          Item: topicRecord,
          ConditionExpression:
            'attribute_not_exists(id) AND attribute_not_exists(#domain)',
          ExpressionAttributeNames: {
            '#domain': 'domain',
          },
        })
        .promise();

      console.log('Topic created successfully:', topicRecord);
      return topicRecord;
    } catch (error: any) {
      console.error('Error creating topic:', error);

      if (error.code === 'ConditionalCheckFailedException') {
        throw new ValidationError(
          'id',
          'Topic with this ID already exists for this domain',
          request.id
        );
      }

      throw new Error('Failed to create topic');
    }
  }

  /**
   * Get topic by ID and domain
   */
  async getTopic(id: string, domain: string): Promise<TopicRecord | null> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      const result = await this.db
        .get({
          TableName: tableName,
          Key: {
            id: id,
            domain: normalizedDomain,
          },
        })
        .promise();

      return (result.Item as TopicRecord) || null;
    } catch (error) {
      console.error('Error retrieving topic:', error);
      throw new Error('Failed to retrieve topic');
    }
  }

  /**
   * Get all topics for a domain with optional filtering and pagination
   */
  async getTopicsByDomain(
    domain: string,
    userId: string,
    options: GetTopicsOptions = {}
  ): Promise<TopicRecord[]> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      let queryParams: any = {
        TableName: tableName,
        IndexName: 'DomainIndex', // We'll need to create this GSI
        KeyConditionExpression: 'domain = :domain',
        ExpressionAttributeValues: {
          ':domain': normalizedDomain,
          ':userId': userId,
        },
        FilterExpression: 'userId = :userId',
      };

      // Add search filter if needed
      if (options.search) {
        queryParams.FilterExpression += ' AND contains(value, :search)';
        queryParams.ExpressionAttributeValues[':search'] =
          options.search.toLowerCase();
      }

      // Add pagination
      if (options.limit) {
        queryParams.Limit = options.limit;
      }

      const result = await this.db.query(queryParams).promise();
      let topics = (result.Items as TopicRecord[]) || [];

      // Apply offset if specified (DynamoDB doesn't support offset directly)
      if (options.offset && options.offset > 0) {
        topics = topics.slice(options.offset);
      }

      return topics;
    } catch (error) {
      console.error('Error retrieving topics by domain:', error);
      throw new Error('Failed to retrieve topics by domain');
    }
  }

  /**
   * Get all topics for a user across all domains
   */
  async getUserTopics(
    userId: string,
    options: GetTopicsOptions = {}
  ): Promise<TopicRecord[]> {
    try {
      let scanParams: any = {
        TableName: tableName,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      };

      // Add search filter if needed
      if (options.search) {
        scanParams.FilterExpression += ' AND contains(value, :search)';
        scanParams.ExpressionAttributeValues[':search'] =
          options.search.toLowerCase();
      }

      // Add pagination
      if (options.limit) {
        scanParams.Limit = options.limit;
      }

      const result = await this.db.scan(scanParams).promise();
      let topics = (result.Items as TopicRecord[]) || [];

      // Apply offset if specified
      if (options.offset && options.offset > 0) {
        topics = topics.slice(options.offset);
      }

      return topics;
    } catch (error) {
      console.error('Error retrieving user topics:', error);
      throw new Error('Failed to retrieve user topics');
    }
  }

  /**
   * Update topic
   */
  async updateTopic(
    id: string,
    domain: string,
    userId: string,
    request: UpdateTopicRequest
  ): Promise<TopicRecord> {
    this.validateTopicData({ value: request.value });

    const normalizedDomain = this.normalizeDomain(domain);
    const currentTime = new Date().toISOString();

    try {
      const updateExpression = 'SET #value = :value, updatedAt = :updatedAt';
      const expressionAttributeNames = {
        '#value': 'value',
      };
      const expressionAttributeValues = {
        ':value': request.value.trim(),
        ':updatedAt': currentTime,
        ':userId': userId,
      };

      const result = await this.db
        .update({
          TableName: tableName,
          Key: {
            id: id,
            domain: normalizedDomain,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'userId = :userId',
          ReturnValues: 'ALL_NEW',
        })
        .promise();

      console.log('Topic updated successfully:', result.Attributes);
      return result.Attributes as TopicRecord;
    } catch (error: any) {
      console.error('Error updating topic:', error);

      if (error.code === 'ConditionalCheckFailedException') {
        throw new ValidationError(
          'id',
          'Topic not found or you do not have permission to update it',
          id
        );
      }

      throw new Error('Failed to update topic');
    }
  }

  /**
   * Delete topic
   */
  async deleteTopic(id: string, domain: string, userId: string): Promise<void> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      await this.db
        .delete({
          TableName: tableName,
          Key: {
            id: id,
            domain: normalizedDomain,
          },
          ConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        })
        .promise();

      console.log('Topic deleted successfully:', {
        id,
        domain: normalizedDomain,
        userId,
      });
    } catch (error: any) {
      console.error('Error deleting topic:', error);

      if (error.code === 'ConditionalCheckFailedException') {
        throw new ValidationError(
          'id',
          'Topic not found or you do not have permission to delete it',
          id
        );
      }

      throw new Error('Failed to delete topic');
    }
  }
}
