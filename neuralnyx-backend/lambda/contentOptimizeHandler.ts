import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { HttpResponse } from './utils/httpResponses';

interface ContentOptimizeRequest {
  content: string;
  title: string;
  meta: string;
  topics: string[];
}

interface ContentOptimizeResponse {
  optimizedContent?: string;
  optimizedTitle?: string;
  optimizedMeta?: string;
  optimizedTopics?: string[];
  suggestions?: string[];
  error?: string;
  analyzedAt: string;
}

const bedrockClient = new BedrockAgentCoreClient({ region: 'us-east-1' });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('📝 Content Optimize Handler invoked:', JSON.stringify(event, null, 2));

  try {
    // Parse the request body
    if (!event.body) {
      return HttpResponse.badRequest('Request body is required');
    }

    const requestBody: ContentOptimizeRequest = JSON.parse(event.body);
    
    // Validate required fields
    if (!requestBody.content || !requestBody.title || !requestBody.meta || !requestBody.topics) {
      return HttpResponse.badRequest('Missing required fields: content, title, meta, topics');
    }

    if (!Array.isArray(requestBody.topics)) {
      return HttpResponse.badRequest('topics must be an array');
    }

    console.log('📤 Optimizing content with Bedrock:', {
      title: requestBody.title,
      contentLength: requestBody.content.length,
      topicsCount: requestBody.topics.length
    });

    // Call Bedrock for content optimization
    const optimizationResult = await optimizeContentWithBedrock(requestBody);

    if (optimizationResult.error) {
      console.error('❌ Content optimization failed:', optimizationResult.error);
      return HttpResponse.internalServerError(optimizationResult.error);
    }

    console.log('✅ Content optimization successful');
    return HttpResponse.ok(optimizationResult);

  } catch (error) {
    console.error('❌ Content optimize handler error:', error);
    return HttpResponse.internalServerError('Failed to optimize content');
  }
};

async function optimizeContentWithBedrock(request: ContentOptimizeRequest): Promise<ContentOptimizeResponse> {
  try {
    // Prepare the payload for Bedrock
    const payload = JSON.stringify({
      content: request.content,
      title: request.title,
      meta: request.meta,
      topics: request.topics
    });

    const input = {
      runtimeSessionId: generateSessionId(),
      agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/content_optimize-IUCiO7AjJn',
      qualifier: 'DEFAULT',
      payload: new TextEncoder().encode(payload),
    };

    console.log('📤 Sending request to Bedrock with payload:', payload);

    const command = new InvokeAgentRuntimeCommand(input);
    const response = await bedrockClient.send(command);
    
    // Convert the response to string
    if (!response.response) {
      throw new Error('No response received from Bedrock');
    }
    const textResponse = await response.response.transformToString();
    console.log('📥 Received response from Bedrock:', textResponse);

    // Parse the response to extract optimization results
    const optimizationResult = parseBedrockOptimizationResponse(textResponse);
    
    if (optimizationResult) {
      return {
        ...optimizationResult,
        analyzedAt: new Date().toISOString(),
      };
    } else {
      return {
        error: 'Could not parse optimization results from Bedrock response',
        analyzedAt: new Date().toISOString(),
      };
    }

  } catch (error) {
    console.error('❌ Failed to optimize content with Bedrock:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred during optimization',
      analyzedAt: new Date().toISOString(),
    };
  }
}

function generateSessionId(): string {
  // Generate a random session ID that's 33+ characters
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `content-optimize-${timestamp}-${random}`;
}

function parseBedrockOptimizationResponse(response: string): ContentOptimizeResponse | null {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    
    // Check if it has the expected structure with specific fields
    if (parsed.optimizedContent || parsed.optimizedTitle || parsed.optimizedMeta || parsed.optimizedTopics) {
      return {
        optimizedContent: parsed.optimizedContent,
        optimizedTitle: parsed.optimizedTitle,
        optimizedMeta: parsed.optimizedMeta,
        optimizedTopics: Array.isArray(parsed.optimizedTopics) ? parsed.optimizedTopics : undefined,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : undefined,
        analyzedAt: new Date().toISOString(),
      };
    }
    
    // Check if it has a 'result' field (common Bedrock agent response format)
    if (parsed.result) {
      return {
        optimizedContent: parsed.result,
        analyzedAt: new Date().toISOString(),
      };
    }
  } catch (jsonError) {
    console.log('Response is not JSON, attempting to extract from text...');
  }

  // If not JSON, try to extract information from text response
  try {
    // Look for patterns in the text response
    const optimizedContentMatch = response.match(/optimizedContent["\s]*:["\s]*"([^"]+)"/i);
    const optimizedTitleMatch = response.match(/optimizedTitle["\s]*:["\s]*"([^"]+)"/i);
    const optimizedMetaMatch = response.match(/optimizedMeta["\s]*:["\s]*"([^"]+)"/i);
    
    // Extract optimized topics (this might be an array)
    const optimizedTopicsMatch = response.match(/optimizedTopics["\s]*:["\s]*\[(.*?)\]/i);
    let optimizedTopics: string[] | undefined;
    
    if (optimizedTopicsMatch) {
      // Parse the array of topics
      const topicsText = optimizedTopicsMatch[1];
      const topicMatches = topicsText.match(/"([^"]+)"/g);
      if (topicMatches) {
        optimizedTopics = topicMatches.map(t => t.replace(/"/g, ''));
      }
    }

    // Extract suggestions (this might be an array)
    const suggestionsMatch = response.match(/suggestions["\s]*:["\s]*\[(.*?)\]/i);
    let suggestions: string[] | undefined;
    
    if (suggestionsMatch) {
      // Parse the array of suggestions
      const suggestionsText = suggestionsMatch[1];
      const suggestionMatches = suggestionsText.match(/"([^"]+)"/g);
      if (suggestionMatches) {
        suggestions = suggestionMatches.map(s => s.replace(/"/g, ''));
      }
    }

    // Return result if we found at least one optimization
    if (optimizedContentMatch || optimizedTitleMatch || optimizedMetaMatch || optimizedTopics) {
      return {
        optimizedContent: optimizedContentMatch?.[1],
        optimizedTitle: optimizedTitleMatch?.[1],
        optimizedMeta: optimizedMetaMatch?.[1],
        optimizedTopics,
        suggestions,
        analyzedAt: new Date().toISOString(),
      };
    }
  } catch (textError) {
    console.error('Failed to parse text response:', textError);
  }

  return null;
}
