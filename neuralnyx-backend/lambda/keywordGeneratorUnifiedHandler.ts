import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';
import { APIGatewayProxyEvent, APIGatewayProxyResult, SNSEvent, SNSHandler } from 'aws-lambda';
import { TopicService } from './services/topicService';

// Initialize the client to call us-east-1 from ap-southeast-1
const config = {
  region: 'us-east-1', // Your agent is in us-east-1
  // Lambda will use IAM role credentials automatically
};
const client = new BedrockAgentCoreClient(config);

const AGENT_RUNTIME_ARN =
  'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/app-Ln6u4wFZmU';

interface GenerateKeywordsRequest {
  domain: string;
  userId: string;
  goals?: string;
  existingKeywords?: string;
  businessSummary?: string;
}

interface DomainEvent {
  eventType: string;
  domain: string;
  userId: string;
  timestamp: string;
  data: any;
  previousData?: any;
}

// Unified handler that can handle both API Gateway and SNS events
export const handler = async (
  event: APIGatewayProxyEvent | SNSEvent
): Promise<APIGatewayProxyResult | void> => {
  console.log('🚀 Keyword Generator Unified Lambda started');
  console.log('📍 Lambda region: ap-southeast-1');
  console.log('🎯 Target agent region: us-east-1');
  console.log('📋 Event:', JSON.stringify(event, null, 2));

  // Check if this is an SNS event
  if ('Records' in event && event.Records[0]?.Sns) {
    return handleSNSEvent(event as SNSEvent);
  }
  
  // Otherwise, handle as API Gateway event
  return handleAPIGatewayEvent(event as APIGatewayProxyEvent);
};

// Handle SNS events (original functionality)
const handleSNSEvent = async (event: SNSEvent): Promise<void> => {
  console.log('📨 Processing SNS event');
  
  for (const record of event.Records) {
    try {
      console.log(`📝 Processing SNS record:`, record);
      const domainEvent: DomainEvent = JSON.parse(record.Sns.Message);
      console.log(`✅ Parsed domain event:`, domainEvent);

      if (domainEvent.eventType === 'DOMAIN_CREATED') {
        console.log(
          `🆕 Handling DOMAIN_CREATED event for domain: ${domainEvent.domain}`
        );
        await processDomainWithBedrock(
          domainEvent.domain, 
          domainEvent.userId, 
          'Increase Brand Awareness', 
          '', 
          '',
          true // Save to DB for SNS events
        );
      } else if (domainEvent.eventType === 'DOMAIN_DELETED') {
        console.log(
          `🗑️ Handling DOMAIN_DELETED event for domain: ${domainEvent.domain}`
        );
        // Handle domain deletion if needed
      } else {
        console.log(`❓ Unknown event type: ${domainEvent.eventType}`);
      }
    } catch (error) {
      console.error('❌ Error processing SNS record:', error);
      // Don't throw error to avoid failing the entire batch
    }
  }

  console.log('🎉 All SNS records processed successfully');
};

// Handle API Gateway events
const handleAPIGatewayEvent = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('🌐 Processing API Gateway event');

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          message: 'Request body is required',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    const requestBody: GenerateKeywordsRequest = JSON.parse(event.body);
    const { domain, userId, goals = 'Increase Brand Awareness', existingKeywords = '', businessSummary = '' } = requestBody;

    // Validate required fields
    if (!domain || !userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          message: 'Both domain and userId are required',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    console.log(`📝 Processing domain: ${domain} for user: ${userId}`);

    // Process domain with Bedrock Agent Core (don't save to DB for API calls)
    const result = await processDomainWithBedrock(domain, userId, goals, existingKeywords, businessSummary, false);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        message: 'Keywords generated successfully',
        data: {
          domain,
          userId,
          goals,
          existingKeywords,
          generatedKeywords: result || [],
          generatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('❌ Error in keyword generator API:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// Process domain with Bedrock Agent Core (unified function)
async function processDomainWithBedrock(
  domain: string,
  userId: string,
  goals: string,
  existingKeywords: string,
  businessSummary: string,
  saveToDatabase: boolean = false,
): Promise<string[] | void> {
  try {
    console.log(`📝 Processing domain: ${domain} for user: ${userId}`);

    const topicService = new TopicService();
    // Create prompt for the agent
    const prompt = `
      Analyze the domain: ${domain} and generate relevant prompts, content suggestions, and SEO recommendations.      
    `;
    console.log(`📝 Prompt: ${prompt}`);

    // Generate unique session ID (must be 33+ characters)
    const runtimeSessionId = `unified-session-${Date.now()}-${Math.random().toString(36).substr(2, 15)}-${domain.replace(/[^a-zA-Z0-9]/g, '').substr(0, 10)}`;

    // Prepare the input with JSON payload format
    const input = {
      runtimeSessionId: runtimeSessionId, // Must be 33+ chars
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      qualifier: 'DEFAULT', // Optional
      payload: new TextEncoder().encode(JSON.stringify({
        "summary": businessSummary,
        "goals": goals,
        "existingKeywords": existingKeywords,
        "domain": domain
      })), // required - encode the JSON payload
    };

    console.log('🤖 Calling Bedrock Agent Core...');
    console.log('📋 Input details:', input);

    // Call Bedrock Agent Core
    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);
    const textResponse = await response.response?.transformToString();

    const keywords = JSON.parse(textResponse || '{}')?.result?.queries;

    console.log('✅ Successfully received response from Bedrock Agent Core');
    console.log('📊 Response:', textResponse);
    
    if (saveToDatabase) {
      console.log('💾 Keywords saved to database');
      for (const keyword of keywords) {
        await topicService.createTopic({
          id: `keyword-generator-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
          domain: domain,
          value: keyword,
          userId: userId,
        });  
      }
    } else {
      return keywords;
    }

    console.log('🎯 Keyword analysis completed for domain:', domain);
    console.log('👤 User ID:', userId);
    console.log('📝 Analysis result:', textResponse);
  } catch (error) {
    console.error('❌ Error processing domain with Bedrock Agent Core:', error);
    console.error('🔍 Error details:', {
      message: (error as Error).message,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
      requestId: (error as any).requestId,
      region: (error as any).region,
      stack: (error as Error).stack,
      domain: domain,
      userId: userId,
    });

    // Log additional debugging info
    console.error('🔧 Debug info:', {
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      clientRegion: 'us-east-1',
      lambdaRegion: process.env.AWS_REGION || 'ap-southeast-1',
    });

    throw error;
  }
}
