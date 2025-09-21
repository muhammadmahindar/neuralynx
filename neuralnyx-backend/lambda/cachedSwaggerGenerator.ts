import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.SWAGGER_CACHE_BUCKET || 'neuralynx-swagger-cache';
const CACHE_KEY = 'swagger.json';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Cached Swagger Generator - checking cache');
  
  try {
    // Try to get cached version from S3
    const cachedSpec = await s3.getObject({
      Bucket: BUCKET_NAME,
      Key: CACHE_KEY,
    }).promise();
    
    console.log('Serving cached Swagger spec from S3');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Cache': 'HIT',
      },
      body: cachedSpec.Body?.toString() || '{}',
    };
  } catch (error: any) {
    if (error.code === 'NoSuchKey') {
      console.log('No cached spec found, generating new one...');
      
      // Generate new spec (this would call your original generator)
      // For now, return a simple error
      return {
        statusCode: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Service Unavailable',
          message: 'Swagger spec not available. Please try again later.',
        }),
      };
    }
    
    console.error('Error retrieving cached spec:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to retrieve Swagger specification',
      }),
    };
  }
};
