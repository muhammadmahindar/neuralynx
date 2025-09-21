import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
} from 'aws-lambda';
import { AuthService } from './services/authService';

// Force new deployment to clear cache

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  try {
    // Extract the token from the Authorization header
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;
    console.log('Auth header:', authHeader);
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;
    console.log(
      'Extracted token:',
      token ? `${token.substring(0, 20)}...` : 'null'
    );

    if (!token) {
      console.log('Available headers:', Object.keys(event.headers || {}));
      throw new Error('No authorization token provided');
    }

    // Validate token using auth service
    const authService = new AuthService();
    const userInfo = await authService.validateToken(token);

    // Generate policy document that allows access to all API resources
    // Extract the API Gateway ARN parts to create a wildcard resource
    console.log('Method ARN:', event.methodArn);
    const methodArnParts = event.methodArn.split('/');
    console.log('Method ARN parts:', methodArnParts);
    // The method ARN structure is: arn:aws:execute-api:region:account:api-id/stage/METHOD/resource
    // We want to create: arn:aws:execute-api:region:account:api-id/stage/*/*
    const baseArn = methodArnParts.slice(0, 2).join('/'); // arn:aws:execute-api:region:account:api-id
    const stage = methodArnParts[2]; // stage (e.g., 'api')
    const wildcardResource = `${baseArn}/${stage}/*`; // Allow all HTTP methods and all resources
    console.log('Base ARN:', baseArn);
    console.log('Stage:', stage);
    console.log('Wildcard resource:', wildcardResource);

    const policyDocument: APIGatewayAuthorizerResult = {
      principalId: userInfo.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: wildcardResource,
          },
        ],
      },
      context: {
        userId: userInfo.sub,
        email: userInfo.email,
        username: userInfo.username,
      },
    };

    console.log('Generated policy:', JSON.stringify(policyDocument, null, 2));
    return policyDocument;
  } catch (error) {
    console.error('Authorization failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      methodArn: event.methodArn,
    });

    // Return deny policy for all resources
    const methodArnParts = event.methodArn.split('/');
    const baseArn = methodArnParts.slice(0, 2).join('/');
    const stage = methodArnParts[2];
    const wildcardResource = `${baseArn}/${stage}/*`;
    console.log('Deny policy - Base ARN:', baseArn);
    console.log('Deny policy - Stage:', stage);
    console.log('Deny policy - Wildcard resource:', wildcardResource);

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: wildcardResource,
          },
        ],
      },
    };
  }
};
