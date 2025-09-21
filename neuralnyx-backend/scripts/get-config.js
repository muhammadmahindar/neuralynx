#!/usr/bin/env node

/**
 * Utility script to get configuration from SSM Parameter Store
 * This can be used by other scripts to get the current configuration
 */

const AWS = require('aws-sdk');

// AWS clients will be configured dynamically
let ssm;

// Function to initialize AWS clients based on environment
function initializeAWSClients(environment, region) {
  if (environment === 'local') {
    // LocalStack configuration
    AWS.config.update({
      region: region,
      endpoint: 'http://localhost:4566',
      accessKeyId: 'test',
      secretAccessKey: 'test',
    });
  } else {
    // Production configuration
    AWS.config.update({
      region: region,
    });
  }

  ssm = new AWS.SSM();
}

async function getConfig() {
  try {
    // First, try to get environment and region from SSM
    // If that fails, assume local environment
    let environment = 'local';
    let region = 'us-east-1';

    try {
      // Try to get environment config from SSM (this will work if stack is deployed)
      const [environmentParam, regionParam] = await Promise.all([
        ssm.getParameter({ Name: '/neuralynx/environment' }).promise(),
        ssm.getParameter({ Name: '/neuralynx/region' }).promise(),
      ]);

      environment = environmentParam.Parameter?.Value || 'local';
      region = regionParam.Parameter?.Value || 'us-east-1';
    } catch (error) {
      // If SSM is not available, assume local environment
      console.log('SSM not available, assuming local environment');
    }

    // Initialize AWS clients based on environment
    initializeAWSClients(environment, region);

    // Now get the actual configuration
    const [userPoolIdParam, userPoolClientIdParam, cognitoIssuerParam] =
      await Promise.all([
        ssm.getParameter({ Name: '/neuralynx/user-pool-id' }).promise(),
        ssm.getParameter({ Name: '/neuralynx/user-pool-client-id' }).promise(),
        ssm.getParameter({ Name: '/neuralynx/cognito-issuer' }).promise(),
      ]);

    const userPoolId = userPoolIdParam.Parameter?.Value;
    const userPoolClientId = userPoolClientIdParam.Parameter?.Value;
    const userPoolIssuer = cognitoIssuerParam.Parameter?.Value;

    if (!userPoolId || !userPoolClientId || !userPoolIssuer) {
      throw new Error('Configuration not found in SSM Parameter Store');
    }

    return {
      userPoolId,
      userPoolClientId,
      userPoolIssuer,
      environment,
      region,
    };
  } catch (error) {
    console.error('Failed to get configuration from SSM:', error.message);
    console.error('Make sure the stack is deployed and SSM parameters exist.');
    process.exit(1);
  }
}

// If run directly, output the configuration
if (require.main === module) {
  getConfig().then((config) => {
    console.log(JSON.stringify(config, null, 2));
  });
}

module.exports = { getConfig };
