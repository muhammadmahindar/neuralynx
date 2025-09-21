import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import {
  HttpResponse,
  ValidationError,
  validateRequestBody,
} from './utils/httpResponses';
import { AuthService } from './services/authService';

interface RefreshRequest {
  refreshToken: string;
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
) => {
  console.log('Refresh event:', JSON.stringify(event, null, 2));

  try {
    // Check HTTP method
    if (event.httpMethod !== 'POST') {
      return HttpResponse.methodNotAllowed(['POST']);
    }

    // Parse and validate request body
    const requestBody: RefreshRequest = validateRequestBody(event.body);
    const { refreshToken } = requestBody;

    if (!refreshToken) {
      throw new ValidationError('refreshToken', 'Refresh token is required');
    }

    // Refresh token using auth service
    const authService = new AuthService();
    const tokenResponse = await authService.refreshToken(refreshToken);

    return HttpResponse.ok(tokenResponse, 'Token refreshed successfully.');
  } catch (error) {
    console.error('Unexpected error in refresh handler:', error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return HttpResponse.badRequest(error.message, {
        field: error.field,
        value: error.value,
      });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return HttpResponse.unauthorized();
    }

    if (error instanceof Error && error.message === 'Invalid refresh token') {
      return HttpResponse.unauthorized('Invalid or expired refresh token');
    }

    return HttpResponse.internalServerError();
  }
};
