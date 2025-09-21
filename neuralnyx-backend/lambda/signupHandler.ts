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
import { AuthService, SignupRequest } from './services/authService';

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Signup event:', JSON.stringify(event, null, 2));

  try {
    if (event.httpMethod !== 'POST') {
      return HttpResponse.methodNotAllowed(['POST']);
    }

    const requestBody: SignupRequest = validateRequestBody(event.body);
    const authService = new AuthService();

    const response = await authService.signup(requestBody);
    return HttpResponse.created(response, 'User registered successfully');
  } catch (error) {
    console.error('Unexpected error in signup handler:', error);

    if (error instanceof ValidationError) {
      return HttpResponse.badRequest(error.message, {
        field: error.field,
        value: error.value,
      });
    }

    return HttpResponse.internalServerError();
  }
};
