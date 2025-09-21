import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import {
  HttpResponse,
  ValidationError,
  validateRequestBody,
} from './utils/httpResponses';
import { AuthService, LoginRequest } from './services/authService';

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Login event:', JSON.stringify(event, null, 2));

  try {
    if (event.httpMethod !== 'POST') {
      return HttpResponse.methodNotAllowed(['POST']);
    }

    const requestBody: LoginRequest = validateRequestBody(event.body);
    const authService = new AuthService();

    const response = await authService.login(requestBody);
    return HttpResponse.ok(response, 'Login successful');
  } catch (error) {
    console.error('Unexpected error in login handler:', error);

    if (error instanceof ValidationError) {
      return HttpResponse.badRequest(error.message, {
        field: error.field,
        value: error.value,
      });
    }

    return HttpResponse.internalServerError();
  }
};
