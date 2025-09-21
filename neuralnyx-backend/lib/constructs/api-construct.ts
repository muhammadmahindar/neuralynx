import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  RestApi,
  LambdaIntegration,
  AuthorizationType,
  CfnAuthorizer,
  JsonSchemaType,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as aws_iam from 'aws-cdk-lib/aws-iam';

export interface ApiConstructProps {
  signupHandler: NodejsFunction;
  loginHandler: NodejsFunction;
  refreshHandler: NodejsFunction;
  domainsHandler: NodejsFunction;
  topicsHandler: NodejsFunction;
  healthHandler: NodejsFunction;
  authorizer: NodejsFunction;
  domainCrawlerHandler: NodejsFunction;
  domainCrawlerApiHandler: NodejsFunction;
  contentHandler: lambda.Function; // Container-based Lambda for Playwright support
  sitemapCrawlerApiHandler: NodejsFunction;
  lighthouseHandler: NodejsFunction;
  keywordGeneratorApiHandler: NodejsFunction;
  bedrockAgentHandler: NodejsFunction;
  environment: string;
}

export class ApiConstruct extends Construct {
  public readonly api: RestApi;
  public readonly tokenAuthorizer: CfnAuthorizer;
  private readonly errorModel: any;

  // Request models
  private signupRequestModel: any;
  private loginRequestModel: any;
  private refreshRequestModel: any;
  private createDomainRequestModel: any;

  // Response models
  private signupResponseModel: any;
  private loginResponseModel: any;
  private refreshResponseModel: any;
  private domainResponseModel: any;
  private domainsResponseModel: any;
  private healthResponseModel: any;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    // Create API Gateway using CDK
    this.api = new RestApi(this, 'ReadAPI', {
      restApiName: 'Neuralynx Backend API',
      description:
        'A comprehensive API for user authentication, domain management, and onboarding',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'api',
      },
    });

    // Create the request authorizer (better than token authorizer for JWT)
    this.tokenAuthorizer = new CfnAuthorizer(this, 'RequestAuthorizer', {
      name: `${cdk.Stack.of(this).stackName}RequestAuthorizer`,
      type: 'REQUEST',
      identitySource: 'method.request.header.Authorization',
      authorizerUri: cdk.Fn.sub(
        'arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${AuthorizerArn}/invocations',
        {
          AuthorizerArn: props.authorizer.functionArn,
        }
      ),
      restApiId: this.api.restApiId,
      authorizerResultTtlInSeconds: 0, // Disable caching to allow all HTTP methods
    });

    // Grant API Gateway permission to invoke the authorizer
    props.authorizer.grantInvoke(
      new aws_iam.ServicePrincipal('apigateway.amazonaws.com')
    );

    // Create shared error model
    this.errorModel = this.createErrorModel();

    // Create all request and response models
    this.createAllModels();

    // Add Lambda integrations to the API Gateway
    this.setupApiIntegrations(props);

    // Add Swagger UI endpoint
    this.addSwaggerUI();
  }

  private createAllModels(): void {
    // Create request models
    this.signupRequestModel = this.createRequestModel('SignupRequest');
    this.loginRequestModel = this.createRequestModel('LoginRequest');
    this.refreshRequestModel = this.createRequestModel('RefreshRequest');
    this.createDomainRequestModel = this.createRequestModel(
      'CreateDomainRequest'
    );

    // Create response models
    this.signupResponseModel = this.createResponseModel('SignupResponse');
    this.loginResponseModel = this.createResponseModel('LoginResponse');
    this.refreshResponseModel = this.createResponseModel('RefreshResponse');
    this.domainResponseModel = this.createResponseModel('DomainResponse');
    this.domainsResponseModel = this.createResponseModel('DomainsResponse');
    this.healthResponseModel = this.createResponseModel('HealthResponse');
  }

  private setupApiIntegrations(props: ApiConstructProps): void {
    // Create resources and add Lambda integrations to the API Gateway with documentation

    // Auth endpoints (no authorization required)
    const authResource = this.api.root.addResource('auth');

    // Signup endpoint with documentation
    const signupResource = authResource.addResource('signup');
    signupResource.addMethod(
      'POST',
      new LambdaIntegration(props.signupHandler),
      {
        operationName: 'SignupUser',
        requestParameters: {
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.signupRequestModel,
        },
        methodResponses: [
          {
            statusCode: '201',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.signupResponseModel,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Login endpoint with documentation
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', new LambdaIntegration(props.loginHandler), {
      operationName: 'LoginUser',
      requestParameters: {
        'method.request.header.Content-Type': true,
      },
      requestModels: {
        'application/json': this.loginRequestModel,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.loginResponseModel,
          },
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.errorModel,
          },
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.errorModel,
          },
        },
      ],
    });

    // Refresh endpoint with documentation
    const refreshResource = authResource.addResource('refresh');
    refreshResource.addMethod(
      'POST',
      new LambdaIntegration(props.refreshHandler),
      {
        operationName: 'RefreshToken',
        requestParameters: {
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.refreshRequestModel,
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.refreshResponseModel,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Domains endpoints (require authorization)
    const domainsResource = this.api.root.addResource('domains');

    // GET domains endpoint
    domainsResource.addMethod(
      'GET',
      new LambdaIntegration(props.domainsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'GetUserDomains',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.querystring.limit': false,
          'method.request.querystring.offset': false,
          'method.request.querystring.active': false,
          'method.request.querystring.search': false,
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.domainsResponseModel,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // POST domains endpoint (create domain)
    domainsResource.addMethod(
      'POST',
      new LambdaIntegration(props.domainsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'CreateDomain',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createDomainRequestModel,
        },
        methodResponses: [
          {
            statusCode: '201',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.domainResponseModel,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Individual domain resource with path parameter
    const domainResource = domainsResource.addResource('{domain}');

    // DELETE /domains/{domain} endpoint
    domainResource.addMethod(
      'DELETE',
      new LambdaIntegration(props.domainsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'DeleteDomain',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.path.domain': true,
        },
        methodResponses: [
          {
            statusCode: '204',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '404',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Sitemap crawler endpoint
    const sitemapResource = this.api.root.addResource('sitemap');
    sitemapResource.addMethod(
      'POST',
      new LambdaIntegration(props.sitemapCrawlerApiHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'CrawlSitemap',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('SitemapRequest'),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel('SitemapResponse'),
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Lighthouse endpoint
    const lighthouseResource = this.api.root.addResource('lighthouse');
    lighthouseResource.addMethod(
      'POST',
      new LambdaIntegration(props.lighthouseHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'LighthouseAudit',
        apiKeyRequired: false,
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('LighthouseRequest'),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json':
                this.createResponseModel('LighthouseResponse'),
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Content endpoints (require authorization)
    const contentResource = this.api.root.addResource('content');

    // POST /content - get all content for a specific domain
    contentResource.addMethod(
      'POST',
      new LambdaIntegration(props.contentHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'GetContentByDomain',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('GetContentRequest'),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel(
                'ContentListResponse'
              ),
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '404',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // POST /content/list - list all content for a specific domain with pagination
    const contentListResource = contentResource.addResource('list');
    contentListResource.addMethod(
      'POST',
      new LambdaIntegration(props.contentHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'ListContentByDomain',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('ListContentRequest'),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel(
                'PaginatedContentListResponse'
              ),
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // POST /content/delete - delete specific content
    const contentDeleteResource = contentResource.addResource('delete');
    contentDeleteResource.addMethod(
      'POST',
      new LambdaIntegration(props.contentHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'DeleteContent',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('DeleteContentRequest'),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel('DeleteResponse'),
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '403',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '404',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    const topicsResource = this.api.root.addResource('topics');

    // GET /topics - get all topics for user
    topicsResource.addMethod(
      'GET',
      new LambdaIntegration(props.topicsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'GetUserTopics',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.querystring.limit': false,
          'method.request.querystring.offset': false,
          'method.request.querystring.search': false,
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json':
                this.createResponseModel('UserTopicsResponse'),
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // POST /topics - create new topic
    topicsResource.addMethod(
      'POST',
      new LambdaIntegration(props.topicsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'CreateTopic',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('CreateTopicRequest'),
        },
        methodResponses: [
          {
            statusCode: '201',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel(
                'CreateTopicResponse'
              ),
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Topics by domain resource
    const topicsByDomainResource = topicsResource.addResource('{domain}');

    // GET /topics/{domain} - get topics for specific domain
    topicsByDomainResource.addMethod(
      'GET',
      new LambdaIntegration(props.topicsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'GetTopicsByDomain',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.path.domain': true,
          'method.request.querystring.limit': false,
          'method.request.querystring.offset': false,
          'method.request.querystring.search': false,
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel(
                'DomainTopicsResponse'
              ),
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '404',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Individual topic resource with path parameters
    const topicResource = topicsByDomainResource.addResource('{id}');

    // PUT /topics/{domain}/{id} - update topic
    topicResource.addMethod('PUT', new LambdaIntegration(props.topicsHandler), {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: this.tokenAuthorizer.ref },
      operationName: 'UpdateTopic',
      requestParameters: {
        'method.request.header.Authorization': true,
        'method.request.header.Content-Type': true,
        'method.request.path.domain': true,
        'method.request.path.id': true,
      },
      requestModels: {
        'application/json': this.createRequestModel('UpdateTopicRequest'),
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.createResponseModel('UpdateTopicResponse'),
          },
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.errorModel,
          },
        },
        {
          statusCode: '404',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.errorModel,
          },
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.errorModel,
          },
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
          responseModels: {
            'application/json': this.errorModel,
          },
        },
      ],
    });

    // DELETE /topics/{domain}/{id} - delete topic
    topicResource.addMethod(
      'DELETE',
      new LambdaIntegration(props.topicsHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'DeleteTopic',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.path.domain': true,
          'method.request.path.id': true,
        },
        methodResponses: [
          {
            statusCode: '204',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '404',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Keyword generator endpoint (require authorization)
    const keywordsResource = this.api.root.addResource('keywords');
    keywordsResource.addMethod(
      'POST',
      new LambdaIntegration(props.keywordGeneratorApiHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'GenerateKeywords',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel(
            'GenerateKeywordsRequest'
          ),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel(
                'GenerateKeywordsResponse'
              ),
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Bedrock Agent endpoint (require authorization)
    const bedrockAgentResource = this.api.root.addResource('bedrock-agent');
    bedrockAgentResource.addMethod(
      'POST',
      new LambdaIntegration(props.bedrockAgentHandler),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: { authorizerId: this.tokenAuthorizer.ref },
        operationName: 'InvokeBedrockAgent',
        requestParameters: {
          'method.request.header.Authorization': true,
          'method.request.header.Content-Type': true,
        },
        requestModels: {
          'application/json': this.createRequestModel('BedrockAgentRequest'),
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.createResponseModel(
                'BedrockAgentResponse'
              ),
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '401',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );

    // Health check endpoint (no authorization required)
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod(
      'GET',
      new LambdaIntegration(props.healthHandler),
      {
        operationName: 'HealthCheck',
        apiKeyRequired: false,
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.healthResponseModel,
            },
          },
          {
            statusCode: '500',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
            responseModels: {
              'application/json': this.errorModel,
            },
          },
        ],
      }
    );
  }

  private createRequestModel(modelName: string) {
    return this.api.addModel(modelName, {
      contentType: 'application/json',
      modelName: modelName,
      schema: this.getRequestSchema(modelName),
    });
  }

  private createResponseModel(modelName: string) {
    return this.api.addModel(modelName, {
      contentType: 'application/json',
      modelName: modelName,
      schema: this.getResponseSchema(modelName),
    });
  }

  private createErrorModel() {
    return this.api.addModel('ErrorResponse', {
      contentType: 'application/json',
      modelName: 'ErrorResponse',
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          error: { type: JsonSchemaType.STRING },
          message: { type: JsonSchemaType.STRING },
          details: { type: JsonSchemaType.OBJECT },
        },
      },
    });
  }

  private getRequestSchema(modelName: string) {
    const schemas: Record<string, any> = {
      SignupRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: {
            type: JsonSchemaType.STRING,
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: JsonSchemaType.STRING,
            minLength: 8,
            description: 'User password (minimum 8 characters)',
          },
          firstName: {
            type: JsonSchemaType.STRING,
            description: 'User first name',
          },
          lastName: {
            type: JsonSchemaType.STRING,
            description: 'User last name',
          },
        },
      },
      LoginRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['email', 'password'],
        properties: {
          email: {
            type: JsonSchemaType.STRING,
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: JsonSchemaType.STRING,
            description: 'User password',
          },
        },
      },
      RefreshRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: JsonSchemaType.STRING,
            description: 'Valid refresh token',
          },
        },
      },
      CreateDomainRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['domain'],
        properties: {
          domain: {
            type: JsonSchemaType.STRING,
            description: 'Domain name to create (e.g., example.com)',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$',
          },
        },
      },
      DeleteContentRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['domain'],
        properties: {
          domain: {
            type: JsonSchemaType.STRING,
            description:
              'Domain or URL to delete content for (e.g., example.com or example.com/blog)',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*([/][^/]*)*$',
          },
        },
      },
      SitemapRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['domain'],
        properties: {
          domain: {
            type: JsonSchemaType.STRING,
            description: 'Domain to crawl sitemap for',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$',
          },
        },
      },
      LighthouseRequest: {
        type: JsonSchemaType.OBJECT,
        properties: {
          domain: {
            type: JsonSchemaType.STRING,
            description:
              'Domain to run Lighthouse audit on (either domain or url is required)',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$',
          },
          url: {
            type: JsonSchemaType.STRING,
            description:
              'Specific URL to run Lighthouse audit on (either domain or url is required)',
            format: 'uri',
          },
        },
        description: 'Either domain or url field is required',
      },
      GenerateKeywordsRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['domain', 'userId'],
        properties: {
          domain: {
            type: JsonSchemaType.STRING,
            description: 'Domain to generate keywords for',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$',
          },
          userId: {
            type: JsonSchemaType.STRING,
            description: 'User ID requesting keyword generation',
          },
          goals: {
            type: JsonSchemaType.STRING,
            description: 'Business goals for keyword generation (optional)',
            default: 'Increase Brand Awareness',
          },
          existingKeywords: {
            type: JsonSchemaType.STRING,
            description: 'Comma-separated list of existing keywords (optional)',
            default: '',
          },
          businessSummary: {
            type: JsonSchemaType.STRING,
            description:
              'Business summary of the domain (optional) - will be used to provide context for keyword generation',
          },
        },
      },
      GetContentRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['url'],
        properties: {
          url: {
            type: JsonSchemaType.STRING,
            description:
              'URL to get content for (e.g., myuae.tax/blog or https://myuae.tax/blog)',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*([/][^/]*)*$',
          },
        },
      },
      BedrockAgentRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['payload'],
        properties: {
          agentRuntimeArn: {
            type: JsonSchemaType.STRING,
            description:
              'Bedrock Agent Runtime ARN (optional, defaults to environment variable)',
          },
          qualifier: {
            type: JsonSchemaType.STRING,
            description: 'Agent qualifier (optional, defaults to DEFAULT)',
            default: 'DEFAULT',
          },
          payload: {
            type: JsonSchemaType.OBJECT,
            description: 'JSON payload to send to the Bedrock Agent',
          },
          sessionId: {
            type: JsonSchemaType.STRING,
            description:
              'Session ID for the agent conversation (optional, auto-generated if not provided)',
          },
        },
      },
      ListContentRequest: {
        type: JsonSchemaType.OBJECT,
        required: ['domain'],
        properties: {
          domain: {
            type: JsonSchemaType.STRING,
            description: 'Domain name to list content for',
            pattern:
              '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$',
          },
          limit: {
            type: JsonSchemaType.NUMBER,
            description: 'Number of content items to return (default: 10)',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          offset: {
            type: JsonSchemaType.NUMBER,
            description: 'Number of content items to skip (default: 0)',
            minimum: 0,
            default: 0,
          },
        },
      },
    };
    return schemas[modelName] || { type: JsonSchemaType.OBJECT };
  }

  private getResponseSchema(modelName: string) {
    const schemas: Record<string, any> = {
      SignupResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the operation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Human-readable message about the operation result',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              userSub: {
                type: JsonSchemaType.STRING,
                description: 'Unique user identifier from Cognito',
              },
              userConfirmed: {
                type: JsonSchemaType.BOOLEAN,
                description: 'Whether the user account is confirmed',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      LoginResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the login was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Login status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              accessToken: {
                type: JsonSchemaType.STRING,
                description: 'JWT access token for API authentication',
              },
              idToken: {
                type: JsonSchemaType.STRING,
                description: 'JWT ID token containing user information',
              },
              refreshToken: {
                type: JsonSchemaType.STRING,
                description: 'Token for refreshing access tokens',
              },
              tokenType: {
                type: JsonSchemaType.STRING,
                description: 'Type of token (typically Bearer)',
              },
              expiresIn: {
                type: JsonSchemaType.NUMBER,
                description: 'Token expiration time in seconds',
              },
              user: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  sub: {
                    type: JsonSchemaType.STRING,
                    description: 'User unique identifier',
                  },
                  email: {
                    type: JsonSchemaType.STRING,
                    format: 'email',
                    description: 'User email address',
                  },
                  username: {
                    type: JsonSchemaType.STRING,
                    description: 'User username',
                  },
                },
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      RefreshResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the token refresh was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Token refresh status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              accessToken: {
                type: JsonSchemaType.STRING,
                description: 'New JWT access token',
              },
              idToken: {
                type: JsonSchemaType.STRING,
                description: 'New JWT ID token',
              },
              tokenType: {
                type: JsonSchemaType.STRING,
                description: 'Type of token (typically Bearer)',
              },
              expiresIn: {
                type: JsonSchemaType.NUMBER,
                description: 'Token expiration time in seconds',
              },
              user: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  sub: {
                    type: JsonSchemaType.STRING,
                    description: 'User unique identifier',
                  },
                  email: {
                    type: JsonSchemaType.STRING,
                    format: 'email',
                    description: 'User email address',
                  },
                  username: {
                    type: JsonSchemaType.STRING,
                    description: 'User username',
                  },
                },
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      DomainResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the operation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Operation status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              userId: {
                type: JsonSchemaType.STRING,
                description: 'Owner of the domain',
              },
              domain: {
                type: JsonSchemaType.STRING,
                description: 'Domain name',
              },
              createdAt: {
                type: JsonSchemaType.STRING,
                format: 'date-time',
                description: 'When the domain was created',
              },
              updatedAt: {
                type: JsonSchemaType.STRING,
                format: 'date-time',
                description: 'When the domain was last updated',
              },
              isActive: {
                type: JsonSchemaType.BOOLEAN,
                description: 'Whether the domain is active',
              },
              lastCrawledAt: {
                type: JsonSchemaType.STRING,
                format: 'date-time',
                description: 'When the domain was last crawled',
              },
              crawlResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  totalPages: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Total number of pages crawled',
                  },
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access crawl data',
                  },
                },
              },
              sitemapResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  totalUrls: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Total number of URLs found in sitemap',
                  },
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access sitemap data',
                  },
                },
              },
              lighthouseResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access Lighthouse report',
                  },
                },
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      HealthResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the service is healthy',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Health check status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              status: {
                type: JsonSchemaType.STRING,
                enum: ['healthy', 'degraded', 'unhealthy'],
                description: 'Service health status',
              },
              service: {
                type: JsonSchemaType.STRING,
                description: 'Service name',
              },
              version: {
                type: JsonSchemaType.STRING,
                description: 'Service version',
              },
              uptime: {
                type: JsonSchemaType.NUMBER,
                description: 'Service uptime in seconds',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the health check',
          },
        },
      },
      DomainsResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the operation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Operation status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              domains: {
                type: JsonSchemaType.ARRAY,
                items: {
                  type: JsonSchemaType.OBJECT,
                  properties: {
                    domain: {
                      type: JsonSchemaType.STRING,
                      description: 'Domain name',
                    },
                    isActive: {
                      type: JsonSchemaType.BOOLEAN,
                      description: 'Whether the domain is active',
                    },
                    lastCrawledAt: {
                      type: JsonSchemaType.STRING,
                      format: 'date-time',
                      description: 'When the domain was last crawled',
                    },
                    crawlResults: {
                      type: JsonSchemaType.OBJECT,
                      properties: {
                        totalPages: {
                          type: JsonSchemaType.NUMBER,
                          description: 'Total number of pages crawled',
                        },
                        presignedUrl: {
                          type: JsonSchemaType.STRING,
                          description: 'Presigned URL to access crawl data',
                        },
                      },
                    },
                    sitemapResults: {
                      type: JsonSchemaType.OBJECT,
                      properties: {
                        totalUrls: {
                          type: JsonSchemaType.NUMBER,
                          description: 'Total number of URLs found in sitemap',
                        },
                        presignedUrl: {
                          type: JsonSchemaType.STRING,
                          description: 'Presigned URL to access sitemap data',
                        },
                      },
                    },
                    lighthouseResults: {
                      type: JsonSchemaType.OBJECT,
                      properties: {
                        presignedUrl: {
                          type: JsonSchemaType.STRING,
                          description:
                            'Presigned URL to access Lighthouse report',
                        },
                      },
                    },
                  },
                },
              },
              total: {
                type: JsonSchemaType.NUMBER,
                description: 'Total number of domains',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      SitemapResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the sitemap crawl was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Sitemap crawl status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              domain: {
                type: JsonSchemaType.STRING,
                description: 'Domain that was crawled',
              },
              totalUrls: {
                type: JsonSchemaType.NUMBER,
                description: 'Total number of URLs found in sitemap',
              },
              presignedUrl: {
                type: JsonSchemaType.STRING,
                description: 'Presigned URL to access sitemap data from S3',
              },
              crawledAt: {
                type: JsonSchemaType.STRING,
                format: 'date-time',
                description: 'When the sitemap was crawled',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      LighthouseResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the Lighthouse audit was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Lighthouse audit status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              url: {
                type: JsonSchemaType.STRING,
                description: 'URL that was audited',
              },
              scores: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  performance: {
                    type: JsonSchemaType.NUMBER,
                    minimum: 0,
                    maximum: 100,
                    description: 'Performance score (0-100)',
                  },
                  accessibility: {
                    type: JsonSchemaType.NUMBER,
                    minimum: 0,
                    maximum: 100,
                    description: 'Accessibility score (0-100)',
                  },
                  bestPractices: {
                    type: JsonSchemaType.NUMBER,
                    minimum: 0,
                    maximum: 100,
                    description: 'Best practices score (0-100)',
                  },
                  seo: {
                    type: JsonSchemaType.NUMBER,
                    minimum: 0,
                    maximum: 100,
                    description: 'SEO score (0-100)',
                  },
                },
              },
              presignedUrl: {
                type: JsonSchemaType.STRING,
                description:
                  'Presigned URL to access full Lighthouse report from S3',
              },
              auditedAt: {
                type: JsonSchemaType.STRING,
                format: 'date-time',
                description: 'When the audit was performed',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      ContentResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the operation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Operation status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              crawlResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  totalPages: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Total number of pages crawled',
                  },
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access crawl data',
                  },
                },
              },
              markdownResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  wordCount: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Word count of the markdown content',
                  },
                  generatedAt: {
                    type: JsonSchemaType.STRING,
                    format: 'date-time',
                    description: 'When the markdown was generated',
                  },
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access markdown content',
                  },
                },
              },
              sitemapResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  totalUrls: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Total number of URLs found in sitemap',
                  },
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access sitemap data',
                  },
                },
              },
              lighthouseResults: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  presignedUrl: {
                    type: JsonSchemaType.STRING,
                    description: 'Presigned URL to access Lighthouse report',
                  },
                },
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      ContentListResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the operation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Operation status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              content: {
                type: JsonSchemaType.ARRAY,
                items: {
                  type: JsonSchemaType.OBJECT,
                  properties: {
                    domain: {
                      type: JsonSchemaType.STRING,
                      description: 'Domain name',
                    },
                    url: {
                      type: JsonSchemaType.STRING,
                      description: 'URL of the content',
                    },
                    userId: {
                      type: JsonSchemaType.STRING,
                      description: 'Owner of the content',
                    },
                    createdAt: {
                      type: JsonSchemaType.STRING,
                      format: 'date-time',
                      description: 'When the content was created',
                    },
                    updatedAt: {
                      type: JsonSchemaType.STRING,
                      format: 'date-time',
                      description: 'When the content was last updated',
                    },
                    crawlData: {
                      type: JsonSchemaType.OBJECT,
                      properties: {
                        title: {
                          type: JsonSchemaType.STRING,
                          description: 'Page title',
                        },
                        statusCode: {
                          type: JsonSchemaType.NUMBER,
                          description: 'HTTP status code',
                        },
                        loadTime: {
                          type: JsonSchemaType.NUMBER,
                          description: 'Page load time in milliseconds',
                        },
                        wordCount: {
                          type: JsonSchemaType.NUMBER,
                          description: 'Word count of the content',
                        },
                        crawledAt: {
                          type: JsonSchemaType.STRING,
                          format: 'date-time',
                          description: 'When the content was crawled',
                        },
                      },
                    },
                    markdownData: {
                      type: JsonSchemaType.OBJECT,
                      properties: {
                        wordCount: {
                          type: JsonSchemaType.NUMBER,
                          description: 'Word count of the markdown',
                        },
                        generatedAt: {
                          type: JsonSchemaType.STRING,
                          format: 'date-time',
                          description: 'When the markdown was generated',
                        },
                      },
                    },
                    lighthouseData: {
                      type: JsonSchemaType.OBJECT,
                      properties: {
                        scores: {
                          type: JsonSchemaType.OBJECT,
                          properties: {
                            performance: {
                              type: JsonSchemaType.NUMBER,
                              minimum: 0,
                              maximum: 100,
                              description: 'Performance score (0-100)',
                            },
                            accessibility: {
                              type: JsonSchemaType.NUMBER,
                              minimum: 0,
                              maximum: 100,
                              description: 'Accessibility score (0-100)',
                            },
                            bestPractices: {
                              type: JsonSchemaType.NUMBER,
                              minimum: 0,
                              maximum: 100,
                              description: 'Best practices score (0-100)',
                            },
                            seo: {
                              type: JsonSchemaType.NUMBER,
                              minimum: 0,
                              maximum: 100,
                              description: 'SEO score (0-100)',
                            },
                          },
                        },
                        auditedAt: {
                          type: JsonSchemaType.STRING,
                          format: 'date-time',
                          description: 'When the audit was performed',
                        },
                      },
                    },
                  },
                },
              },
              total: {
                type: JsonSchemaType.NUMBER,
                description: 'Total number of content items',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      PaginatedContentListResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the operation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Operation status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              content: {
                type: JsonSchemaType.ARRAY,
                items: {
                  type: JsonSchemaType.OBJECT,
                  properties: {
                    domain: {
                      type: JsonSchemaType.STRING,
                      description: 'Domain name',
                    },
                    url: {
                      type: JsonSchemaType.STRING,
                      description: 'URL of the content',
                    },
                    title: {
                      type: JsonSchemaType.STRING,
                      description: 'Page title',
                    },
                    wordCount: {
                      type: JsonSchemaType.NUMBER,
                      description: 'Word count of the content',
                    },
                    crawledAt: {
                      type: JsonSchemaType.STRING,
                      format: 'date-time',
                      description: 'When the content was crawled',
                    },
                    updatedAt: {
                      type: JsonSchemaType.STRING,
                      format: 'date-time',
                      description: 'When the content was last updated',
                    },
                    hasMarkdown: {
                      type: JsonSchemaType.BOOLEAN,
                      description: 'Whether markdown data is available',
                    },
                    hasLighthouse: {
                      type: JsonSchemaType.BOOLEAN,
                      description: 'Whether lighthouse data is available',
                    },
                  },
                },
              },
              pagination: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  total: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Total number of content items',
                  },
                  limit: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Number of items requested',
                  },
                  offset: {
                    type: JsonSchemaType.NUMBER,
                    description: 'Number of items skipped',
                  },
                  hasMore: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Whether there are more items available',
                  },
                  nextOffset: {
                    type: JsonSchemaType.NUMBER,
                    description:
                      'Offset for the next page (null if no more items)',
                  },
                },
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      DeleteResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the deletion was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Deletion status message',
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      CreateTopicResponse: {
        type: JsonSchemaType.OBJECT,
        properties: {
          id: { type: JsonSchemaType.STRING },
          domain: { type: JsonSchemaType.STRING },
          value: { type: JsonSchemaType.STRING },
          createdAt: { type: JsonSchemaType.STRING },
        },
      },
      UpdateTopicResponse: {
        type: JsonSchemaType.OBJECT,
        properties: {
          id: { type: JsonSchemaType.STRING },
          domain: { type: JsonSchemaType.STRING },
          value: { type: JsonSchemaType.STRING },
          updatedAt: { type: JsonSchemaType.STRING },
        },
      },
      UserTopicsResponse: {
        type: JsonSchemaType.ARRAY,
        items: {
          type: JsonSchemaType.OBJECT,
          properties: {
            id: { type: JsonSchemaType.STRING },
            domain: { type: JsonSchemaType.STRING },
            value: { type: JsonSchemaType.STRING },
            createdAt: { type: JsonSchemaType.STRING },
            updatedAt: { type: JsonSchemaType.STRING },
          },
        },
      },
      DomainTopicsResponse: {
        type: JsonSchemaType.ARRAY,
        items: {
          type: JsonSchemaType.OBJECT,
          properties: {
            id: { type: JsonSchemaType.STRING },
            domain: { type: JsonSchemaType.STRING },
            value: { type: JsonSchemaType.STRING },
            createdAt: { type: JsonSchemaType.STRING },
            updatedAt: { type: JsonSchemaType.STRING },
          },
        },
      },
      GenerateKeywordsResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Indicates if the keyword generation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Keyword generation status message',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            properties: {
              domain: {
                type: JsonSchemaType.STRING,
                description: 'Domain that keywords were generated for',
              },
              userId: {
                type: JsonSchemaType.STRING,
                description: 'User who requested the keywords',
              },
              goals: {
                type: JsonSchemaType.STRING,
                description: 'Business goals used for keyword generation',
              },
              existingKeywords: {
                type: JsonSchemaType.STRING,
                description: 'Existing keywords provided in the request',
              },
              businessSummary: {
                type: JsonSchemaType.STRING,
                description:
                  'Business summary used for keyword generation context',
              },
              generatedKeywords: {
                type: JsonSchemaType.ARRAY,
                items: {
                  type: JsonSchemaType.STRING,
                },
                description: 'Array of generated keywords',
              },
              generatedAt: {
                type: JsonSchemaType.STRING,
                format: 'date-time',
                description: 'When the keywords were generated',
              },
            },
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
      },
      BedrockAgentResponse: {
        type: JsonSchemaType.OBJECT,
        required: ['success', 'message', 'timestamp'],
        properties: {
          success: {
            type: JsonSchemaType.BOOLEAN,
            description:
              'Indicates if the Bedrock Agent invocation was successful',
          },
          message: {
            type: JsonSchemaType.STRING,
            description: 'Status message of the agent invocation',
          },
          data: {
            type: JsonSchemaType.OBJECT,
            description: 'Response data from the Bedrock Agent (optional)',
          },
          sessionId: {
            type: JsonSchemaType.STRING,
            description: 'Session ID used for the agent conversation',
          },
          timestamp: {
            type: JsonSchemaType.STRING,
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
          error: {
            type: JsonSchemaType.STRING,
            description: 'Error message if the invocation failed (optional)',
          },
        },
      },
    };
    return schemas[modelName] || { type: JsonSchemaType.OBJECT };
  }

  private addSwaggerUI(): void {
    // Create a Lambda function to serve Swagger UI
    const swaggerUIHandler = new NodejsFunction(this, 'SwaggerUIHandler', {
      entry: 'lambda/swaggerUIHandler.ts',
      handler: 'handler',
      environment: {
        API_ID: this.api.restApiId,
        REGION: cdk.Stack.of(this).region,
      },
    });

    // Create a Lambda function to serve static Swagger JSON
    const swaggerGenerator = new NodejsFunction(this, 'SwaggerGenerator', {
      entry: 'lambda/staticSwaggerGenerator.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(10), // Much faster since it's static
      memorySize: 128, // Lower memory since it's just serving static content
    });

    // No IAM permissions needed for static Swagger generator

    // Add Swagger UI endpoint
    const docsResource = this.api.root.addResource('docs');
    docsResource.addMethod('GET', new LambdaIntegration(swaggerUIHandler));

    // Add Swagger JSON endpoint
    const swaggerResource = this.api.root.addResource('swagger.json');
    swaggerResource.addMethod('GET', new LambdaIntegration(swaggerGenerator));
  }
}
