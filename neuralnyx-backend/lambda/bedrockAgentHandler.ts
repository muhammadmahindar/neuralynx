import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Initialize the client to call us-east-1 from ap-southeast-1
const config = {
  region: 'us-east-1', // Bedrock Agent is in us-east-1
  // Lambda will use IAM role credentials automatically
};
const client = new BedrockAgentCoreClient(config);

interface BedrockAgentRequest {
  payload: Record<string, any>;
}

interface BedrockAgentResponse {
  success: boolean;
  data?: any;
  message: string;
  sessionId?: string;
  timestamp: string;
  error?: string;
}

/**
 * Generic Bedrock Agent Lambda Handler
 * Provides a flexible interface to interact with Bedrock Agent Core
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('🚀 Bedrock Agent Core Lambda started');
  console.log('📍 Lambda region: ap-southeast-1');
  console.log('🎯 Target agent region: us-east-1');
  console.log('📋 Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const requestBody: BedrockAgentRequest = JSON.parse(event.body);
    const { payload } = requestBody;

    // Validate required fields
    if (!payload || typeof payload !== 'object') {
      return createErrorResponse(
        400,
        'Payload is required and must be an object'
      );
    }

    console.log(`🤖 Processing Bedrock Agent request`);
    console.log(`📄 Payload:`, JSON.stringify(payload, null, 2));

    // Invoke Bedrock Agent Core
    const result = await invokeBedrockAgent(payload);

    return createSuccessResponse(result);
  } catch (error) {
    console.error('❌ Error in Bedrock Agent handler:', error);

    return createErrorResponse(
      500,
      'Internal server error',
      (error as Error).message
    );
  }
};

/**
 * Invoke Bedrock Agent Core with the provided parameters
 */
async function invokeBedrockAgent(
  payload: Record<string, any>
): Promise<BedrockAgentResponse> {
  try {
    // Generate unique session ID if not provided (must be 33+ characters)
    const runtimeSessionId = `bedrock-session-${Date.now()}-${Math.random().toString(36).substr(2, 15)}-${Math.random().toString(36).substr(2, 10)}`;
    console.log(`🔑 Session ID: ${runtimeSessionId}`);

    // Prepare the input with JSON payload format
    const input = {
      runtimeSessionId: runtimeSessionId, // Must be 33+ chars
      agentRuntimeArn:
        'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/app_content-Js4Y56HdPw',
      qualifier: 'DEFAULT',
      payload: new TextEncoder().encode(JSON.stringify(payload)), // Encode the JSON payload
    };

    console.log('🤖 Calling Bedrock Agent Core...');
    console.log('📋 Input details (without payload):', {
      runtimeSessionId: input.runtimeSessionId,
      agentRuntimeArn: input.agentRuntimeArn,
      qualifier: input.qualifier,
      payloadSize: input.payload.length,
    });

    // Call Bedrock Agent Core
    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);
    const textResponse = await response.response?.transformToString();

    console.log('✅ Successfully received response from Bedrock Agent Core');
    console.log('📊 Response:', textResponse);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(textResponse || '{}');
    } catch (parseError) {
      console.warn('⚠️ Failed to parse response as JSON, returning as text');
      parsedResponse = { rawResponse: textResponse };
    }

    return {
      success: true,
      data: parsedResponse,
      message: 'Agent invocation completed successfully',
      sessionId: runtimeSessionId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error invoking Bedrock Agent Core:', error);
    console.error('🔍 Error details:', {
      message: (error as Error).message,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
      requestId: (error as any).requestId,
      region: (error as any).region,
      stack: (error as Error).stack,
    });

    // Log additional debugging info
    console.error('🔧 Debug info:', {
      clientRegion: 'us-east-1',
      lambdaRegion: process.env.AWS_REGION || 'ap-southeast-1',
    });

    throw error;
  }
}

/**
 * Create a successful HTTP response
 */
function createSuccessResponse(
  data: BedrockAgentResponse
): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Create an error HTTP response
 */
function createErrorResponse(
  statusCode: number,
  message: string,
  error?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify({
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Utility function to handle OPTIONS requests for CORS
 */
export const optionsHandler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: '',
  };
};
