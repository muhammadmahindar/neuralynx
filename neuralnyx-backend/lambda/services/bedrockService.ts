import { getBedrock } from '../utils/awsClients';
import * as AWS from 'aws-sdk';

export interface KeywordAnalysisResult {
  domain: string;
  domainDescription: string;
  primaryTopics: string[];
  suggestedKeywords: string[];
  contentSuggestions: string[];
  targetAudience: string;
  businessType: string;
  confidence: number;
}

export class BedrockService {
  private bedrock: AWS.BedrockRuntime | null = null;
  private readonly modelId: string = 'anthropic.claude-3-haiku-20240307-v1';

  constructor() {
    console.log('🔧 BedrockService: Initializing Bedrock service...');
    console.log(`🤖 BedrockService: Using model ID: ${this.modelId}`);
    console.log(
      '✅ BedrockService: Initialization complete (lazy loading enabled)'
    );
  }

  private getBedrockClient(): AWS.BedrockRuntime {
    if (!this.bedrock) {
      console.log('🔧 BedrockService: Lazy loading Bedrock client...');
      try {
        this.bedrock = getBedrock();
        console.log('✅ BedrockService: Bedrock client loaded successfully');
      } catch (error) {
        console.error(
          '❌ BedrockService: Failed to load Bedrock client:',
          error
        );
        throw new Error(`Failed to load Bedrock client: ${error}`);
      }
    }
    return this.bedrock;
  }

  /**
   * Analyze domain and generate keywords using Bedrock AI
   */
  async analyzeDomainAndGenerateKeywords(
    domain: string
  ): Promise<KeywordAnalysisResult> {
    try {
      console.log(`🤖 Starting Bedrock analysis for domain: ${domain}`);
      console.log(`🔧 BedrockService: Model ID: ${this.modelId}`);

      const prompt = this.buildAnalysisPrompt(domain);
      console.log(
        `📝 BedrockService: Built prompt (${prompt.length} characters)`
      );

      console.log('🚀 BedrockService: Sending request to Bedrock...');
      const requestBody = {
        prompt: prompt,
        num_predict: 200,
        temperature: 0.3,
      };
      console.log(
        `📤 BedrockService: Request body:`,
        JSON.stringify(requestBody, null, 2)
      );

      const bedrockClient = this.getBedrockClient();

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Bedrock request timeout after 300 seconds')),
          300000
        );
      });

      const response = (await Promise.race([
        bedrockClient
          .invokeModel({
            modelId: this.modelId,
            body: JSON.stringify(requestBody),
            contentType: 'application/json',
          })
          .promise(),
        timeoutPromise,
      ])) as AWS.BedrockRuntime.InvokeModelResponse;

      console.log('📥 BedrockService: Received response from Bedrock');
      console.log(
        `📊 BedrockService: Response status: ${(response as any).$response?.httpResponse?.statusCode || 'unknown'}`
      );

      const responseBody = JSON.parse(response.body?.toString() || '{}');
      console.log(
        `📋 BedrockService: Response body keys:`,
        Object.keys(responseBody)
      );
      console.log(
        `📋 BedrockService: Full response body:`,
        JSON.stringify(responseBody, null, 2)
      );

      const analysisText =
        responseBody.generation || responseBody.content?.[0]?.text || '';
      console.log(
        `📝 BedrockService: Analysis text length: ${analysisText.length} characters`
      );
      console.log(`📄 BedrockService: WHOLE RESPONSE:`, analysisText);

      console.log(`✅ Bedrock analysis completed for domain: ${domain}`);

      return this.parseAnalysisResponse(domain, analysisText);
    } catch (error) {
      console.error(`❌ Bedrock analysis failed for domain ${domain}:`, error);
      console.error(`🔍 BedrockService: Error details:`, {
        message: (error as Error).message,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
        stack: (error as Error).stack,
      });

      throw new Error(`Failed to analyze domain with Bedrock: ${error}`);
    }
  }

  /**
   * Build the analysis prompt for the LLM
   */
  private buildAnalysisPrompt(domain: string): string {
    return `Analyze the domain "${domain}" and provide 10 relevant keywords for content creation.

Return this exact JSON format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"]
}`;
  }

  /**
   * Parse the LLM response into structured data
   */
  private parseAnalysisResponse(
    domain: string,
    responseText: string
  ): KeywordAnalysisResult {
    try {
      console.log(
        `🔍 BedrockService: Parsing analysis response for domain: ${domain}`
      );
      console.log(`📄 BedrockService: Raw response text:`, responseText);

      // Clean the response text - remove any leading/trailing text that's not JSON
      let cleanText = responseText.trim();

      // Find the first { and last } to extract just the JSON part
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        console.log(
          `🧹 BedrockService: Extracted JSON from response:`,
          cleanText
        );
      } else {
        console.error(
          '❌ BedrockService: No valid JSON braces found in response'
        );
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(cleanText);
      console.log(`✅ BedrockService: Successfully parsed JSON:`, parsed);

      const result = {
        domain,
        domainDescription: `Keywords for ${domain}`,
        primaryTopics: [],
        suggestedKeywords: parsed.keywords || [],
        contentSuggestions: [],
        targetAudience: 'General audience',
        businessType: 'Unknown',
        confidence: 0.8,
      };

      console.log(`🎯 BedrockService: Final analysis result:`, result);
      return result;
    } catch (error) {
      console.error(
        '❌ BedrockService: Failed to parse Bedrock response:',
        error
      );
      console.error('📄 BedrockService: Raw response:', responseText);

      // Fallback response
      const fallbackResult = {
        domain,
        domainDescription: 'Unable to analyze domain content',
        primaryTopics: ['general'],
        suggestedKeywords: ['website', 'online', 'services'],
        contentSuggestions: ['Create informative content about your services'],
        targetAudience: 'General audience',
        businessType: 'Unknown',
        confidence: 0.1,
      };

      console.log(`🔄 BedrockService: Using fallback result:`, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Generate additional keywords based on existing ones
   */
  async generateAdditionalKeywords(
    domain: string,
    existingKeywords: string[],
    focusArea: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on the domain "${domain}" and existing keywords: ${existingKeywords.join(', ')}, generate 10 additional relevant keywords focused on "${focusArea}". 

Return only a JSON array of keyword strings, no other text.`;

      const bedrockClient = this.getBedrockClient();
      const response = await bedrockClient
        .invokeModel({
          modelId: this.modelId,
          body: JSON.stringify({
            prompt: prompt,
            num_predict: 500,
            temperature: 0.4,
          }),
          contentType: 'application/json',
        })
        .promise();

      console.log(
        `📄 BedrockService: WHOLE RESPONSE:`,
        response.body?.toString()
      );
      const responseBody = JSON.parse(response.body?.toString() || '{}');
      const responseText =
        responseBody.generation || responseBody.content?.[0]?.text || '[]';

      return JSON.parse(responseText);
    } catch (error) {
      console.error(
        `Failed to generate additional keywords for ${domain}:`,
        error
      );
      return [];
    }
  }
}
