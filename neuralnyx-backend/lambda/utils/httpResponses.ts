import { APIGatewayProxyResult } from 'aws-lambda';

// Common CORS headers
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

// HTTP Response utility class
export class HttpResponse {
  private static createResponse(
    statusCode: number,
    body: any,
    additionalHeaders: Record<string, string> = {}
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers: { ...CORS_HEADERS, ...additionalHeaders },
      body: JSON.stringify(body),
    };
  }

  // Success responses
  static ok(data: any, message?: string): APIGatewayProxyResult {
    return this.createResponse(200, {
      success: true,
      message: message || 'Request successful',
      data,
    });
  }

  static created(
    data: any,
    message: string = 'Resource created successfully'
  ): APIGatewayProxyResult {
    return this.createResponse(201, {
      success: true,
      message,
      data,
    });
  }

  // Client error responses
  static badRequest(error: string, details?: any): APIGatewayProxyResult {
    return this.createResponse(400, {
      success: false,
      error,
      ...(details && { details }),
    });
  }

  static unauthorized(
    error: string = 'Unauthorized. Please provide a valid authentication token.'
  ): APIGatewayProxyResult {
    return this.createResponse(401, {
      success: false,
      error,
    });
  }

  static forbidden(
    error: string = 'Forbidden. You do not have permission to access this resource.'
  ): APIGatewayProxyResult {
    return this.createResponse(403, {
      success: false,
      error,
    });
  }

  static notFound(error: string = 'Resource not found'): APIGatewayProxyResult {
    return this.createResponse(404, {
      success: false,
      error,
    });
  }

  static methodNotAllowed(
    allowedMethods: string[] = ['POST']
  ): APIGatewayProxyResult {
    return this.createResponse(405, {
      success: false,
      error: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    });
  }

  static noContent(message: string = 'Success'): APIGatewayProxyResult {
    return this.createResponse(204, {
      success: true,
      message,
    });
  }

  static conflict(error: string, details?: any): APIGatewayProxyResult {
    return this.createResponse(409, {
      success: false,
      error,
      ...(details && { details }),
    });
  }

  static unprocessableEntity(
    error: string,
    details?: any
  ): APIGatewayProxyResult {
    return this.createResponse(422, {
      success: false,
      error,
      ...(details && { details }),
    });
  }

  // Server error responses
  static internalServerError(
    error: string = 'Internal server error'
  ): APIGatewayProxyResult {
    return this.createResponse(500, {
      success: false,
      error,
    });
  }

  static tooManyRequests(
    error: string = 'Too many requests. Please try again later.'
  ): APIGatewayProxyResult {
    return this.createResponse(429, {
      success: false,
      error,
    });
  }

  static serviceUnavailable(
    error: string = 'Service temporarily unavailable'
  ): APIGatewayProxyResult {
    return this.createResponse(503, {
      success: false,
      error,
    });
  }

  // Custom response
  static custom(
    statusCode: number,
    body: any,
    headers?: Record<string, string>
  ): APIGatewayProxyResult {
    return this.createResponse(statusCode, body, headers);
  }
}

// Validation error response helper
export class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Domain validation helper
export const validateDomain = (domain: string): void => {
  if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
    throw new ValidationError(
      'domain',
      'Domain is required and must be a non-empty string',
      domain
    );
  }

  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
  if (!domainRegex.test(domain.trim())) {
    throw new ValidationError('domain', 'Invalid domain format', domain);
  }
};

// Request body validation helper
export const validateRequestBody = (body: string | null): any => {
  if (!body) {
    throw new ValidationError('body', 'Request body is required');
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new ValidationError('body', 'Invalid JSON in request body');
  }
};

// Authentication helper
export const getAuthenticatedUser = (
  event: any
): { userId: string; email: string; username: string } => {
  const authorizer = event.requestContext.authorizer;
  const userId = authorizer?.userId;
  const email = authorizer?.email;
  const username = authorizer?.username;

  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  return { userId, email, username };
};
