import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// Singleton instances for AWS clients
let dynamoDb: DocumentClient;
let cognito: AWS.CognitoIdentityServiceProvider;
let ssm: AWS.SSM;
let bedrock: AWS.BedrockRuntime;
let s3: AWS.S3;

// Configuration cache
let configCache: {
  userPoolId?: string;
  userPoolClientId?: string;
  userPoolIssuer?: string;
  environment?: string;
  region?: string;
} = {};

/**
 * Initialize AWS clients based on environment (LocalStack vs Production)
 */
export function initializeAWSClients(): void {
  const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
  // In Lambda, AWS SDK automatically detects the region from the runtime environment
  // Only specify region for LocalStack
  const region = isLocalStack ? 'us-east-1' : undefined;

  console.log('🔧 AWS Client Configuration:', {
    isLocalStack,
    region,
    endpoint: process.env.AWS_ENDPOINT_URL,
    localstackEndpoint: process.env.LOCALSTACK_ENDPOINT,
    allEnvVars: {
      AWS_REGION: process.env.AWS_REGION,
      AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
      LOCALSTACK_ENDPOINT: process.env.LOCALSTACK_ENDPOINT,
    },
  });

  const commonConfig = {
    ...(region && { region }), // Only set region if specified (for LocalStack)
    ...(isLocalStack && {
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://172.18.0.2:4566',
      accessKeyId: 'test',
      secretAccessKey: 'test',
    }),
  };

  console.log('🔧 Final AWS Config:', commonConfig);

  console.log('Common Config:', commonConfig);

  // Initialize DynamoDB DocumentClient
  if (!dynamoDb) {
    dynamoDb = new AWS.DynamoDB.DocumentClient(commonConfig);
  }

  // Initialize Cognito
  if (!cognito) {
    cognito = new AWS.CognitoIdentityServiceProvider(commonConfig);
  }

  // Initialize SSM
  if (!ssm) {
    ssm = new AWS.SSM(commonConfig);
  }

  // Initialize Bedrock
  if (!bedrock) {
    bedrock = new AWS.BedrockRuntime(commonConfig);
  }

  // Initialize S3
  if (!s3) {
    s3 = new AWS.S3(commonConfig);
  }
}

/**
 * Get DynamoDB DocumentClient instance
 */
export function getDynamoDB(): DocumentClient {
  console.log('🔧 getDynamoDB() called');
  if (!dynamoDb) {
    console.log('🔧 DynamoDB client not initialized, initializing lazily...');
    try {
      const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
      const commonConfig = {
        ...(isLocalStack && {
          region: 'us-east-1', // LocalStack uses us-east-1
          endpoint: process.env.AWS_ENDPOINT_URL || 'http://172.18.0.2:4566',
          s3ForcePathStyle: true,
          sslEnabled: false,
        }),
        // For AWS Lambda, don't specify region - let AWS SDK auto-detect
      };
      dynamoDb = new AWS.DynamoDB.DocumentClient(commonConfig);
      console.log('✅ DynamoDB client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize DynamoDB client:', error);
      throw error;
    }
  }
  console.log('✅ getDynamoDB() returning client');
  return dynamoDb;
}

/**
 * Get Cognito instance
 */
export function getCognito(): AWS.CognitoIdentityServiceProvider {
  if (!cognito) {
    initializeAWSClients();
  }
  return cognito;
}

/**
 * Get SSM instance
 */
export function getSSM(): AWS.SSM {
  console.log('🔧 getSSM() called');
  if (!ssm) {
    console.log(
      '🔧 SSM client not initialized, calling initializeAWSClients()...'
    );
    initializeAWSClients();
  }
  console.log('✅ getSSM() returning client');
  return ssm;
}

/**
 * Get Bedrock instance
 */
export function getBedrock(): AWS.BedrockRuntime {
  console.log('🔧 getBedrock() called');
  if (!bedrock) {
    console.log('🔧 Bedrock client not initialized, initializing lazily...');
    try {
      const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
      const commonConfig = {
        ...(isLocalStack && {
          region: 'us-east-1', // LocalStack uses us-east-1
          endpoint: process.env.AWS_ENDPOINT_URL || 'http://172.18.0.2:4566',
          s3ForcePathStyle: true,
          sslEnabled: false,
        }),
        // For AWS Lambda, don't specify region - let AWS SDK auto-detect
      };
      bedrock = new AWS.BedrockRuntime(commonConfig);
      console.log('✅ Bedrock client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Bedrock client:', error);
      throw error;
    }
  }
  console.log('✅ getBedrock() returning client');
  return bedrock;
}

/**
 * Get S3 instance
 */
export function getS3(): AWS.S3 {
  console.log('🔧 getS3() called');
  if (!s3) {
    console.log('🔧 S3 client not initialized, initializing lazily...');
    try {
      const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
      const commonConfig = {
        ...(isLocalStack && {
          region: 'us-east-1', // LocalStack uses us-east-1
          endpoint: process.env.AWS_ENDPOINT_URL || 'http://172.18.0.2:4566',
          s3ForcePathStyle: true,
          sslEnabled: false,
        }),
        // For AWS Lambda, don't specify region - let AWS SDK auto-detect
      };
      s3 = new AWS.S3(commonConfig);
      console.log('✅ S3 client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize S3 client:', error);
      throw error;
    }
  }
  console.log('✅ getS3() returning client');
  return s3;
}

/**
 * Get configuration from SSM Parameter Store with caching
 */
export async function getConfig(): Promise<{
  userPoolId: string;
  userPoolClientId: string;
  userPoolIssuer: string;
  environment: string;
  region: string;
}> {
  // Return cached config if available (but always refresh for now to ensure we get latest SSM values)
  // TODO: Implement proper cache invalidation based on SSM parameter versions
  // if (configCache.userPoolId && configCache.userPoolClientId && configCache.userPoolIssuer) {
  //   return configCache as Required<typeof configCache>;
  // }

  try {
    const ssmClient = getSSM();

    // Get all configuration parameters in parallel
    const [
      userPoolIdParam,
      userPoolClientIdParam,
      cognitoIssuerParam,
      environmentParam,
      regionParam,
    ] = await Promise.all([
      ssmClient.getParameter({ Name: '/neuralynx/user-pool-id' }).promise(),
      ssmClient
        .getParameter({ Name: '/neuralynx/user-pool-client-id' })
        .promise(),
      ssmClient.getParameter({ Name: '/neuralynx/cognito-issuer' }).promise(),
      ssmClient.getParameter({ Name: '/neuralynx/environment' }).promise(),
      ssmClient.getParameter({ Name: '/neuralynx/region' }).promise(),
    ]);

    const config = {
      userPoolId: userPoolIdParam.Parameter?.Value,
      userPoolClientId: userPoolClientIdParam.Parameter?.Value,
      userPoolIssuer: cognitoIssuerParam.Parameter?.Value,
      environment: environmentParam.Parameter?.Value || 'aws',
      region:
        regionParam.Parameter?.Value ||
        process.env.AWS_REGION ||
        'ap-southeast-1',
    };

    // Validate required parameters
    if (
      !config.userPoolId ||
      !config.userPoolClientId ||
      !config.userPoolIssuer
    ) {
      throw new Error('Missing required configuration parameters from SSM');
    }

    // Cache the configuration
    configCache = config;

    console.log('Configuration loaded from SSM:', {
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      environment: config.environment,
      region: config.region,
    });

    return {
      userPoolId: config.userPoolId!,
      userPoolClientId: config.userPoolClientId!,
      userPoolIssuer: config.userPoolIssuer!,
      environment: config.environment,
      region: config.region,
    };
  } catch (error) {
    console.error('Failed to load configuration from SSM:', error);
    throw new Error('Configuration not available');
  }
}

/**
 * Clear configuration cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache = {};
}

/**
 * Get only Cognito configuration (for auth operations)
 */
export async function getCognitoConfig(): Promise<{
  userPoolId: string;
  userPoolClientId: string;
  userPoolIssuer: string;
}> {
  const config = await getConfig();
  return {
    userPoolId: config.userPoolId,
    userPoolClientId: config.userPoolClientId,
    userPoolIssuer: config.userPoolIssuer,
  };
}
