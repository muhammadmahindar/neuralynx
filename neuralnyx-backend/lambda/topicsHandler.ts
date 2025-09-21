import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import {
  TopicService,
  CreateTopicRequest,
  UpdateTopicRequest,
  GetTopicsOptions,
} from './services/topicService';
import {
  HttpResponse,
  ValidationError,
  validateRequestBody,
  getAuthenticatedUser,
} from './utils/httpResponses';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('🚀 Topics Handler: Starting processing...');
  console.log('📋 Topics Handler: Event details:', {
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers,
  });

  try {
    // Get authenticated user
    const user = getAuthenticatedUser(event);
    const userId = user.userId;
    console.log('👤 Topics Handler: Authenticated user ID:', userId);

    // Initialize topic service
    const topicService = new TopicService();
    console.log('🔧 Topics Handler: Topic service initialized');

    // Handle different HTTP methods and paths
    if (event.httpMethod === 'GET') {
      return await handleGetTopics(event, topicService, userId);
    } else if (event.httpMethod === 'POST') {
      return await handleCreateTopic(event, topicService, userId);
    } else if (
      event.httpMethod === 'PUT' &&
      event.pathParameters?.id &&
      event.pathParameters?.domain
    ) {
      return await handleUpdateTopic(event, topicService, userId);
    } else if (
      event.httpMethod === 'DELETE' &&
      event.pathParameters?.id &&
      event.pathParameters?.domain
    ) {
      return await handleDeleteTopic(event, topicService, userId);
    } else {
      return HttpResponse.methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
    }
  } catch (error) {
    console.error('❌ Topics Handler: Unexpected error:', error);
    return HttpResponse.internalServerError('Internal server error');
  }
};

// Handle create topic operation
async function handleCreateTopic(
  event: APIGatewayProxyEvent,
  topicService: TopicService,
  userId: string
) {
  try {
    console.log('📝 Topics Handler: Creating new topic...');
    const requestBody: CreateTopicRequest = validateRequestBody(event.body);
    const { id, domain, value } = requestBody;

    console.log(
      `🏗️ Topics Handler: Creating topic: ${id} for domain: ${domain} and user: ${userId}`
    );

    const topicRecord = await topicService.createTopic({
      id,
      domain,
      value,
      userId,
    });

    console.log('✅ Topics Handler: Topic created successfully:', topicRecord);

    return HttpResponse.created({
      id: topicRecord.id,
      domain: topicRecord.domain,
      value: topicRecord.value,
      createdAt: topicRecord.createdAt,
    });
  } catch (error) {
    console.error('❌ Topics Handler: Error creating topic:', error);

    if (error instanceof ValidationError) {
      console.log('⚠️ Topics Handler: Validation error');
      return HttpResponse.badRequest(`Validation error: ${error.message}`);
    }

    return HttpResponse.internalServerError('Failed to create topic');
  }
}

// Handle get topics operation
async function handleGetTopics(
  event: APIGatewayProxyEvent,
  topicService: TopicService,
  userId: string
) {
  console.log('📋 Topics Handler: Handling get topics operation...');

  // Check if we're getting topics for a specific domain or all topics
  const domain = event.pathParameters?.domain;

  // Parse query parameters
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit)
    : undefined;
  const offset = event.queryStringParameters?.offset
    ? parseInt(event.queryStringParameters.offset)
    : undefined;
  const search = event.queryStringParameters?.search;

  console.log('🔍 Topics Handler: Query parameters:', {
    limit,
    offset,
    search,
    domain,
  });

  const options: GetTopicsOptions = {
    limit,
    offset,
    search,
  };

  try {
    let topics;

    if (domain) {
      // Get topics for specific domain
      console.log(`📋 Topics Handler: Getting topics for domain: ${domain}`);
      topics = await topicService.getTopicsByDomain(domain, userId, options);
    } else {
      // Get all topics for user
      console.log('📋 Topics Handler: Getting all topics for user');
      topics = await topicService.getUserTopics(userId, options);
    }

    // Return only essential topic data
    const optimizedTopics = topics.map((topic) => ({
      id: topic.id,
      domain: topic.domain,
      value: topic.value,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    }));

    return HttpResponse.ok(optimizedTopics);
  } catch (error) {
    console.error('❌ Topics Handler: Error getting topics:', error);
    return HttpResponse.internalServerError('Failed to retrieve topics');
  }
}

// Handle update topic operation
async function handleUpdateTopic(
  event: APIGatewayProxyEvent,
  topicService: TopicService,
  userId: string
) {
  try {
    console.log('📝 Topics Handler: Updating topic...');

    const id = event.pathParameters!.id!;
    const domain = event.pathParameters!.domain!;
    const requestBody: UpdateTopicRequest = validateRequestBody(event.body);
    const { value } = requestBody;

    console.log(
      `🔄 Topics Handler: Updating topic: ${id} for domain: ${domain} and user: ${userId}`
    );

    const topicRecord = await topicService.updateTopic(id, domain, userId, {
      value,
    });

    console.log('✅ Topics Handler: Topic updated successfully:', topicRecord);

    return HttpResponse.ok({
      id: topicRecord.id,
      domain: topicRecord.domain,
      value: topicRecord.value,
      updatedAt: topicRecord.updatedAt,
    });
  } catch (error) {
    console.error('❌ Topics Handler: Error updating topic:', error);

    if (error instanceof ValidationError) {
      console.log('⚠️ Topics Handler: Validation error');
      return HttpResponse.badRequest(`Validation error: ${error.message}`);
    }

    return HttpResponse.internalServerError('Failed to update topic');
  }
}

// Handle delete topic operation
async function handleDeleteTopic(
  event: APIGatewayProxyEvent,
  topicService: TopicService,
  userId: string
) {
  try {
    console.log('🗑️ Topics Handler: Deleting topic...');

    const id = event.pathParameters!.id!;
    const domain = event.pathParameters!.domain!;

    console.log(
      `🗑️ Topics Handler: Deleting topic: ${id} for domain: ${domain} and user: ${userId}`
    );

    await topicService.deleteTopic(id, domain, userId);

    console.log('✅ Topics Handler: Topic deleted successfully');

    return HttpResponse.noContent();
  } catch (error) {
    console.error('❌ Topics Handler: Error deleting topic:', error);

    if (error instanceof ValidationError) {
      console.log('⚠️ Topics Handler: Validation error');
      return HttpResponse.badRequest(`Validation error: ${error.message}`);
    }

    return HttpResponse.internalServerError('Failed to delete topic');
  }
}
