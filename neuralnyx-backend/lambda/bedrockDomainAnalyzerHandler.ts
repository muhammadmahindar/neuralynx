import { SNSEvent, SNSHandler } from 'aws-lambda';
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { DynamoDB } from 'aws-sdk';

interface DomainEvent {
  eventType: string;
  userId: string;
  domain: string;
  timestamp: string;
  data: any;
  previousData?: any;
}

interface BusinessAnalysisResult {
  summary: string;
  businessType: string;
  targetAudience: string;
  keyServices: string[];
  industry: string;
}

const dynamodb = new DynamoDB.DocumentClient();
const bedrockClient = new BedrockAgentCoreClient({ region: 'us-east-1' });

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log(
    '🤖 Bedrock domain analyzer handler invoked with SNS event:',
    JSON.stringify(event, null, 2)
  );

  for (const record of event.Records) {
    try {
      const domainEvent: DomainEvent = JSON.parse(record.Sns.Message);

      console.log(
        `Processing ${domainEvent.eventType} event for domain: ${domainEvent.domain}`
      );

      // Only process domain creation events
      if (domainEvent.eventType === 'DOMAIN_CREATED') {
        await analyzeDomainWithBedrock(domainEvent);
      }
    } catch (error) {
      console.error('❌ Failed to process SNS record:', error);
      // Don't throw error to avoid failing the entire batch
    }
  }
};

async function analyzeDomainWithBedrock(domainEvent: DomainEvent): Promise<void> {
  const { userId, domain } = domainEvent;
  
  try {
    console.log(`🔍 Starting Bedrock analysis for domain: ${domain}`);

    // Prepare the payload for Bedrock
    const payload = JSON.stringify({ domain });
    const input = {
      runtimeSessionId: generateSessionId(),
      agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/domainanalyzer-CJTMTzFPN5',
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

    // Parse the response to extract business analysis
    const businessAnalysis = parseBedrockResponse(textResponse);
    
    if (businessAnalysis) {
      // Update the domain record with business analysis
      await updateDomainWithBusinessAnalysis(userId, domain, businessAnalysis);
      console.log(`✅ Successfully updated domain ${domain} with business analysis`);
    } else {
      console.warn(`⚠️ Could not parse business analysis for domain: ${domain}`);
    }

  } catch (error) {
    console.error(`❌ Failed to analyze domain ${domain} with Bedrock:`, error);
    
    // Update domain with error information
    await updateDomainWithError(userId, domain, error);
  }
}

function generateSessionId(): string {
  // Generate a random session ID that's 33+ characters
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `bedrock-${timestamp}-${random}`;
}

function parseBedrockResponse(response: string): BusinessAnalysisResult | null {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    
    // Check if it has the expected structure
    if (parsed.summary && parsed.businessType && parsed.targetAudience && parsed.keyServices && parsed.industry) {
      return {
        summary: parsed.summary,
        businessType: parsed.businessType,
        targetAudience: parsed.targetAudience,
        keyServices: Array.isArray(parsed.keyServices) ? parsed.keyServices : [],
        industry: parsed.industry,
      };
    }
  } catch (jsonError) {
    console.log('Response is not JSON, attempting to extract from text...');
  }

  // If not JSON, try to extract information from text response
  try {
    // Look for patterns in the text response
    const summaryMatch = response.match(/summary["\s]*:["\s]*"([^"]+)"/i);
    const businessTypeMatch = response.match(/business_type["\s]*:["\s]*"([^"]+)"/i);
    const targetAudienceMatch = response.match(/target_audience["\s]*:["\s]*"([^"]+)"/i);
    const industryMatch = response.match(/industry["\s]*:["\s]*"([^"]+)"/i);
    
    // Extract key services (this might be an array)
    const keyServicesMatch = response.match(/key_services["\s]*:["\s]*\[(.*?)\]/i);
    let keyServices: string[] = [];
    
    if (keyServicesMatch) {
      // Parse the array of services
      const servicesText = keyServicesMatch[1];
      const serviceMatches = servicesText.match(/"([^"]+)"/g);
      if (serviceMatches) {
        keyServices = serviceMatches.map(s => s.replace(/"/g, ''));
      }
    }

    if (summaryMatch && businessTypeMatch && targetAudienceMatch && industryMatch) {
      return {
        summary: summaryMatch[1],
        businessType: businessTypeMatch[1],
        targetAudience: targetAudienceMatch[1],
        keyServices,
        industry: industryMatch[1],
      };
    }
  } catch (textError) {
    console.error('Failed to parse text response:', textError);
  }

  return null;
}

async function updateDomainWithBusinessAnalysis(
  userId: string,
  domain: string,
  businessAnalysis: BusinessAnalysisResult
): Promise<void> {
  const analyzedAt = new Date().toISOString();
  
  const updateParams = {
    TableName: process.env.DOMAIN_TABLE_NAME!,
    Key: {
      userId,
      domain,
    },
    UpdateExpression: 'SET businessAnalysis = :businessAnalysis, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':businessAnalysis': {
        ...businessAnalysis,
        analyzedAt,
      },
      ':updatedAt': analyzedAt,
    },
  };

  await dynamodb.update(updateParams).promise();
}

async function updateDomainWithError(
  userId: string,
  domain: string,
  error: any
): Promise<void> {
  const updatedAt = new Date().toISOString();
  
  const updateParams = {
    TableName: process.env.DOMAIN_TABLE_NAME!,
    Key: {
      userId,
      domain,
    },
    UpdateExpression: 'SET businessAnalysis = :businessAnalysis, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':businessAnalysis': {
        error: error.message || 'Unknown error occurred during analysis',
        analyzedAt: updatedAt,
        status: 'failed',
      },
      ':updatedAt': updatedAt,
    },
  };

  await dynamodb.update(updateParams).promise();
}
