import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Static OpenAPI specification - generated once and stored here
const staticOpenApiSpec = {
  openapi: '3.0.1',
  info: {
    title: 'Neuralynx Backend API',
    description: 'A comprehensive API for user authentication, domain management, and onboarding',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'https://8532iatotg.execute-api.ap-southeast-1.amazonaws.com/api',
      description: 'AWS API Gateway Server',
    },
  ],
  components: {
    securitySchemes: {
      customAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Custom JWT token authentication',
      },
    },
    schemas: {
      SignupRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', description: 'User email address' },
          password: { type: 'string', minLength: 8, description: 'User password (minimum 8 characters)' },
          firstName: { type: 'string', description: 'User first name' },
          lastName: { type: 'string', description: 'User last name' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', description: 'User email address' },
          password: { type: 'string', description: 'User password' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', description: 'Valid refresh token' },
        },
      },
      CreateDomainRequest: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { 
            type: 'string', 
            description: 'Domain name to create (e.g., example.com)',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$'
          },
        },
      },
      DeleteContentRequest: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { 
            type: 'string', 
            description: 'Domain or URL to delete content for (e.g., example.com or example.com/blog)',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*([/][^/]*)*$'
          },
        },
      },
      SitemapRequest: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { 
            type: 'string', 
            description: 'Domain to crawl sitemap for',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$'
          },
        },
      },
      LighthouseRequest: {
        type: 'object',
        properties: {
          domain: { 
            type: 'string', 
            description: 'Domain to run Lighthouse audit on (either domain or url is required)',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$'
          },
          url: { 
            type: 'string', 
            format: 'uri',
            description: 'Specific URL to run Lighthouse audit on (either domain or url is required)'
          },
        },
        description: 'Either domain or url field is required',
      },
      CreateTopicRequest: {
        type: 'object',
        required: ['domain', 'value'],
        properties: {
          domain: { type: 'string', description: 'Domain name' },
          value: { type: 'string', description: 'Topic value' },
        },
      },
      UpdateTopicRequest: {
        type: 'object',
        required: ['value'],
        properties: {
          value: { type: 'string', description: 'Updated topic value' },
        },
      },
      GetContentRequest: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { 
            type: 'string', 
            description: 'URL to get content for (e.g., myuae.tax/blog or https://myuae.tax/blog)',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*([/][^/]*)*$'
          },
        },
      },
      ListContentRequest: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { 
            type: 'string', 
            description: 'Domain name to list content for',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$'
          },
          limit: { 
            type: 'number', 
            description: 'Number of content items to return (default: 10)',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          offset: { 
            type: 'number', 
            description: 'Number of content items to skip (default: 0)',
            minimum: 0,
            default: 0
          },
        },
      },
      SignupResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the operation was successful' },
          message: { type: 'string', description: 'Human-readable message about the operation result' },
          data: {
            type: 'object',
            properties: {
              userSub: { type: 'string', description: 'Unique user identifier from Cognito' },
              userConfirmed: { type: 'boolean', description: 'Whether the user account is confirmed' },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the login was successful' },
          message: { type: 'string', description: 'Login status message' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', description: 'JWT access token for API authentication' },
              idToken: { type: 'string', description: 'JWT ID token containing user information' },
              refreshToken: { type: 'string', description: 'Token for refreshing access tokens' },
              tokenType: { type: 'string', description: 'Type of token (typically Bearer)' },
              expiresIn: { type: 'number', description: 'Token expiration time in seconds' },
              user: {
                type: 'object',
                properties: {
                  sub: { type: 'string', description: 'User unique identifier' },
                  email: { type: 'string', format: 'email', description: 'User email address' },
                  username: { type: 'string', description: 'User username' },
                },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      RefreshResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the token refresh was successful' },
          message: { type: 'string', description: 'Token refresh status message' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', description: 'New JWT access token' },
              idToken: { type: 'string', description: 'New JWT ID token' },
              tokenType: { type: 'string', description: 'Type of token (typically Bearer)' },
              expiresIn: { type: 'number', description: 'Token expiration time in seconds' },
              user: {
                type: 'object',
                properties: {
                  sub: { type: 'string', description: 'User unique identifier' },
                  email: { type: 'string', format: 'email', description: 'User email address' },
                  username: { type: 'string', description: 'User username' },
                },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      DomainResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the operation was successful' },
          message: { type: 'string', description: 'Operation status message' },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'Owner of the domain' },
              domain: { type: 'string', description: 'Domain name' },
              createdAt: { type: 'string', format: 'date-time', description: 'When the domain was created' },
              updatedAt: { type: 'string', format: 'date-time', description: 'When the domain was last updated' },
              isActive: { type: 'boolean', description: 'Whether the domain is active' },
              lastCrawledAt: { type: 'string', format: 'date-time', description: 'When the domain was last crawled' },
              crawlResults: {
                type: 'object',
                properties: {
                  totalPages: { type: 'number', description: 'Total number of pages crawled' },
                  presignedUrl: { type: 'string', description: 'Presigned URL to access crawl data' },
                },
              },
              sitemapResults: {
                type: 'object',
                properties: {
                  totalUrls: { type: 'number', description: 'Total number of URLs found in sitemap' },
                  presignedUrl: { type: 'string', description: 'Presigned URL to access sitemap data' },
                },
              },
              lighthouseResults: {
                type: 'object',
                properties: {
                  presignedUrl: { type: 'string', description: 'Presigned URL to access Lighthouse report' },
                },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      DomainsResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the operation was successful' },
          message: { type: 'string', description: 'Operation status message' },
          data: {
            type: 'object',
            properties: {
              domains: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string', description: 'Domain name' },
                    isActive: { type: 'boolean', description: 'Whether the domain is active' },
                    lastCrawledAt: { type: 'string', format: 'date-time', description: 'When the domain was last crawled' },
                    crawlResults: {
                      type: 'object',
                      properties: {
                        totalPages: { type: 'number', description: 'Total number of pages crawled' },
                        presignedUrl: { type: 'string', description: 'Presigned URL to access crawl data' },
                      },
                    },
                    sitemapResults: {
                      type: 'object',
                      properties: {
                        totalUrls: { type: 'number', description: 'Total number of URLs found in sitemap' },
                        presignedUrl: { type: 'string', description: 'Presigned URL to access sitemap data' },
                      },
                    },
                    lighthouseResults: {
                      type: 'object',
                      properties: {
                        presignedUrl: { type: 'string', description: 'Presigned URL to access Lighthouse report' },
                      },
                    },
                    businessAnalysis: {
                      type: 'object',
                      properties: {
                        summary: { type: 'string', description: 'Business summary from AI analysis' },
                        businessType: { type: 'string', description: 'Type of business identified' },
                        targetAudience: { type: 'string', description: 'Target audience identified' },
                        keyServices: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Key services offered by the business'
                        },
                        industry: { type: 'string', description: 'Industry classification' },
                        analyzedAt: { type: 'string', format: 'date-time', description: 'When the analysis was performed' },
                      },
                    },
                  },
                },
              },
              total: { type: 'number', description: 'Total number of domains' },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      SitemapResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the sitemap crawl was successful' },
          message: { type: 'string', description: 'Sitemap crawl status message' },
          data: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Domain that was crawled' },
              totalUrls: { type: 'number', description: 'Total number of URLs found in sitemap' },
              presignedUrl: { type: 'string', description: 'Presigned URL to access sitemap data from S3' },
              crawledAt: { type: 'string', format: 'date-time', description: 'When the sitemap was crawled' },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      LighthouseResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the Lighthouse audit was successful' },
          message: { type: 'string', description: 'Lighthouse audit status message' },
          data: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL that was audited' },
              scores: {
                type: 'object',
                properties: {
                  performance: { type: 'number', minimum: 0, maximum: 100, description: 'Performance score (0-100)' },
                  accessibility: { type: 'number', minimum: 0, maximum: 100, description: 'Accessibility score (0-100)' },
                  bestPractices: { type: 'number', minimum: 0, maximum: 100, description: 'Best practices score (0-100)' },
                  seo: { type: 'number', minimum: 0, maximum: 100, description: 'SEO score (0-100)' },
                },
              },
              presignedUrl: { type: 'string', description: 'Presigned URL to access full Lighthouse report from S3' },
              auditedAt: { type: 'string', format: 'date-time', description: 'When the audit was performed' },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      ContentListResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the operation was successful' },
          message: { type: 'string', description: 'Operation status message' },
          data: {
            type: 'object',
            properties: {
              content: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string', description: 'Domain name' },
                    url: { type: 'string', description: 'URL of the content' },
                    userId: { type: 'string', description: 'Owner of the content' },
                    createdAt: { type: 'string', format: 'date-time', description: 'When the content was created' },
                    updatedAt: { type: 'string', format: 'date-time', description: 'When the content was last updated' },
                    crawlData: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Page title' },
                        statusCode: { type: 'number', description: 'HTTP status code' },
                        loadTime: { type: 'number', description: 'Page load time in milliseconds' },
                        wordCount: { type: 'number', description: 'Word count of the content' },
                        crawledAt: { type: 'string', format: 'date-time', description: 'When the content was crawled' },
                      },
                    },
                    markdownData: {
                      type: 'object',
                      properties: {
                        wordCount: { type: 'number', description: 'Word count of the markdown' },
                        generatedAt: { type: 'string', format: 'date-time', description: 'When the markdown was generated' },
                      },
                    },
                    lighthouseData: {
                      type: 'object',
                      properties: {
                        scores: {
                          type: 'object',
                          properties: {
                            performance: { type: 'number', minimum: 0, maximum: 100, description: 'Performance score (0-100)' },
                            accessibility: { type: 'number', minimum: 0, maximum: 100, description: 'Accessibility score (0-100)' },
                            bestPractices: { type: 'number', minimum: 0, maximum: 100, description: 'Best practices score (0-100)' },
                            seo: { type: 'number', minimum: 0, maximum: 100, description: 'SEO score (0-100)' },
                          },
                        },
                        auditedAt: { type: 'string', format: 'date-time', description: 'When the audit was performed' },
                      },
                    },
                  },
                },
              },
              total: { type: 'number', description: 'Total number of content items' },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      PaginatedContentListResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the operation was successful' },
          message: { type: 'string', description: 'Operation status message' },
          data: {
            type: 'object',
            properties: {
              content: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string', description: 'Domain name' },
                    url: { type: 'string', description: 'URL of the content' },
                    title: { type: 'string', description: 'Page title' },
                    wordCount: { type: 'number', description: 'Word count of the content' },
                    crawledAt: { type: 'string', format: 'date-time', description: 'When the content was crawled' },
                    updatedAt: { type: 'string', format: 'date-time', description: 'When the content was last updated' },
                    hasMarkdown: { type: 'boolean', description: 'Whether markdown data is available' },
                    hasLighthouse: { type: 'boolean', description: 'Whether lighthouse data is available' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number', description: 'Total number of content items' },
                  limit: { type: 'number', description: 'Number of items requested' },
                  offset: { type: 'number', description: 'Number of items skipped' },
                  hasMore: { type: 'boolean', description: 'Whether there are more items available' },
                  nextOffset: { type: 'number', description: 'Offset for the next page (null if no more items)' },
                },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      DeleteResponse: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the deletion was successful' },
          message: { type: 'string', description: 'Deletion status message' },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the response' },
        },
      },
      CreateTopicResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          domain: { type: 'string' },
          value: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
      UpdateTopicResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          domain: { type: 'string' },
          value: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      UserTopicsResponse: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            domain: { type: 'string' },
            value: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
      DomainTopicsResponse: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            domain: { type: 'string' },
            value: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', description: 'Indicates if the service is healthy' },
          message: { type: 'string', description: 'Health check status message' },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'], description: 'Service health status' },
              service: { type: 'string', description: 'Service name' },
              version: { type: 'string', description: 'Service version' },
              uptime: { type: 'number', description: 'Service uptime in seconds' },
            },
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of the health check' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
        },
      },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        summary: 'SignupUser',
        description: 'Operation: SignupUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SignupRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SignupResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'LoginUser',
        description: 'Operation: LoginUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'RefreshToken',
        description: 'Operation: RefreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RefreshRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RefreshResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/domains': {
      get: {
        summary: 'GetUserDomains',
        description: 'Operation: GetUserDomains',
        security: [{ customAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Number of domains to return',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of domains to skip',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'active',
            in: 'query',
            description: 'Filter by active status',
            required: false,
            schema: { type: 'boolean' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term for domain names',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Domains retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DomainsResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'CreateDomain',
        description: 'Operation: CreateDomain',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateDomainRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Domain created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DomainResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/domains/{domain}': {
      delete: {
        summary: 'DeleteDomain',
        description: 'Operation: DeleteDomain',
        security: [{ customAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'path',
            description: 'Domain name to delete',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Domain deleted successfully',
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Domain not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/sitemap': {
      post: {
        summary: 'CrawlSitemap',
        description: 'Operation: CrawlSitemap',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SitemapRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sitemap crawled successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SitemapResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/lighthouse': {
      post: {
        summary: 'LighthouseAudit',
        description: 'Operation: LighthouseAudit',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LighthouseRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Lighthouse audit completed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LighthouseResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/content': {
      post: {
        summary: 'GetContentByDomain',
        description: 'Operation: GetContentByDomain',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/GetContentRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Content retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContentListResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Domain not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/content/list': {
      post: {
        summary: 'ListContentByDomain',
        description: 'Operation: ListContentByDomain - List all content for a specific domain with pagination',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ListContentRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Content list retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedContentListResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/content/delete': {
      post: {
        summary: 'DeleteContent',
        description: 'Operation: DeleteContent',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/DeleteContentRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Content deleted successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeleteResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Content not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/topics': {
      get: {
        summary: 'GetUserTopics',
        description: 'Operation: GetUserTopics',
        security: [{ customAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Number of topics to return',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of topics to skip',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term for topic values',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Topics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserTopicsResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'CreateTopic',
        description: 'Operation: CreateTopic',
        security: [{ customAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateTopicRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Topic created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateTopicResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/topics/{domain}': {
      get: {
        summary: 'GetTopicsByDomain',
        description: 'Operation: GetTopicsByDomain',
        security: [{ customAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'path',
            description: 'Domain name to get topics for',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of topics to return',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of topics to skip',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term for topic values',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Topics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DomainTopicsResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Domain not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/topics/{domain}/{id}': {
      put: {
        summary: 'UpdateTopic',
        description: 'Operation: UpdateTopic',
        security: [{ customAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'path',
            description: 'Domain name',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'id',
            in: 'path',
            description: 'Topic ID',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateTopicRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Topic updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateTopicResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Topic not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        summary: 'DeleteTopic',
        description: 'Operation: DeleteTopic',
        security: [{ customAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'path',
            description: 'Domain name',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'id',
            in: 'path',
            description: 'Topic ID',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Topic deleted successfully',
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Topic not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'HealthCheck',
        description: 'Operation: HealthCheck',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Static Swagger Generator - serving cached spec');
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
    body: JSON.stringify(staticOpenApiSpec, null, 2),
  };
};