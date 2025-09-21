import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoConstruct } from './constructs/cognito-construct';
import { DatabaseConstruct } from './constructs/database-construct';
import { LambdaConstruct } from './constructs/lambda-construct';
import { ContainerLambdaConstruct } from './constructs/container-lambda-construct';
import { ApiConstruct } from './constructs/api-construct';
import { S3Construct } from './constructs/s3-construct';
import { SnsConstruct } from './constructs/sns-construct';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';

export class NeuralynxBackendStack extends cdk.Stack {
  public readonly cognito: CognitoConstruct;
  public readonly database: DatabaseConstruct;
  public readonly lambda: LambdaConstruct;
  public readonly containerLambda: ContainerLambdaConstruct;
  public readonly api: ApiConstruct;
  public readonly s3: S3Construct;
  public readonly sns: SnsConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext('environment') || 'local';

    // Create Cognito construct
    this.cognito = new CognitoConstruct(this, 'Cognito', {
      environment,
    });

    // Create S3 construct
    this.s3 = new S3Construct(this, 'S3', {
      environment,
    });

    // Create SNS construct
    this.sns = new SnsConstruct(this, 'SNS', {
      environment,
    });

    // Create Lambda construct first (without database dependency for stream handler)
    this.lambda = new LambdaConstruct(this, 'Lambda', {
      environment,
      domainEventsTopic: this.sns.domainEventsTopic,
    });

    // Create Container Lambda construct for Lighthouse crawling
    this.containerLambda = new ContainerLambdaConstruct(
      this,
      'ContainerLambda',
      {
        domainTable: undefined, // Will be set later
        contentTable: undefined, // Will be set later
        crawlResultsBucket: this.s3.crawlResultsBucket,
        environment,
      }
    );

    // Create Database construct with stream handler and SNS topic
    this.database = new DatabaseConstruct(this, 'Database', {
      domainStreamHandler: this.lambda.domainStreamHandler,
      domainEventsTopic: this.sns.domainEventsTopic,
    });

    // Update lambda construct with database tables and S3 bucket
    this.lambda.setDomainTable(this.database.domainTable);
    this.lambda.setContentTable(this.database.contentTable);
    this.lambda.setTopicsTable(this.database.topicsTable);
    this.lambda.setKeywordTables(
      this.database.keywordsTable,
      this.database.errorLogsTable
    );
    this.lambda.setCrawlResultsBucket(this.s3.crawlResultsBucket);

    // Update container lambda construct with database tables
    this.containerLambda.setContentTable(this.database.contentTable);
    this.containerLambda.setDomainTable(this.database.domainTable);

    // Add SNS subscriptions for all handlers
    this.sns.addLambdaSubscription(this.containerLambda.domainCrawlerHandler, {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['DOMAIN_CREATED', 'DOMAIN_UPDATED'],
      }),
    });

    this.sns.addLambdaSubscription(this.containerLambda.lighthouseHandler, {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['DOMAIN_CREATED', 'DOMAIN_UPDATED'],
      }),
    });

    this.sns.addLambdaSubscription(this.lambda.sitemapCrawlerHandler, {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['DOMAIN_CREATED', 'DOMAIN_UPDATED'],
      }),
    });

    this.sns.addLambdaSubscription(this.lambda.keywordGeneratorApiHandler, {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['DOMAIN_CREATED', 'DOMAIN_UPDATED', 'DOMAIN_DELETED'],
      }),
    });

    this.sns.addLambdaSubscription(this.lambda.bedrockDomainAnalyzerHandler, {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['DOMAIN_CREATED'],
      }),
    });

    // Grant publish permissions to stream handler
    this.sns.grantPublishToLambda(this.lambda.domainStreamHandler);

    // Update container lambda construct with database table
    this.containerLambda.domainCrawlerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [this.database.domainTable.tableArn],
      })
    );

    // Grant DynamoDB permissions to lighthouse handler
    this.containerLambda.lighthouseHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [this.database.domainTable.tableArn],
      })
    );

    // Grant DynamoDB permissions to bedrock domain analyzer handler
    this.lambda.bedrockDomainAnalyzerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [this.database.domainTable.tableArn],
      })
    );

    // Grant Bedrock permissions to bedrock domain analyzer handler
    this.lambda.bedrockDomainAnalyzerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock-agentcore:InvokeAgentRuntime',
        ],
        resources: [
          'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/domainanalyzer-CJTMTzFPN5',
          'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/domainanalyzer-CJTMTzFPN5/runtime-endpoint/DEFAULT',
        ],
      })
    );

    // Create SSM parameter for bucket name (still needed for S3 operations)
    new StringParameter(this, 'CrawlResultsBucketName', {
      parameterName: '/neuralynx/domain-crawler/bucket-name',
      stringValue: this.s3.crawlResultsBucket.bucketName,
      description: 'S3 bucket name for crawl results',
    });

    // Grant S3 permissions to Lambda functions that need to access S3 objects
    this.s3.crawlResultsBucket.grantRead(this.lambda.domainsHandler);
    this.s3.crawlResultsBucket.grantReadWrite(
      this.containerLambda.domainCrawlerHandler
    );
    this.s3.crawlResultsBucket.grantReadWrite(
      this.containerLambda.lighthouseHandler
    );
    this.s3.crawlResultsBucket.grantReadWrite(
      this.lambda.sitemapCrawlerHandler
    );
    this.s3.crawlResultsBucket.grantReadWrite(
      this.lambda.sitemapCrawlerApiHandler
    );

    // Create API construct
    this.api = new ApiConstruct(this, 'API', {
      signupHandler: this.lambda.signupHandler,
      loginHandler: this.lambda.loginHandler,
      refreshHandler: this.lambda.refreshHandler,
      domainsHandler: this.lambda.domainsHandler,
      topicsHandler: this.lambda.topicsHandler,
      healthHandler: this.lambda.healthHandler,
      authorizer: this.lambda.authorizer,
      domainCrawlerHandler: this.containerLambda.domainCrawlerHandler,
      domainCrawlerApiHandler: this.containerLambda.domainCrawlerApiHandler,
      contentHandler: this.containerLambda.contentHandler,
      sitemapCrawlerApiHandler: this.lambda.sitemapCrawlerApiHandler,
      lighthouseHandler: this.containerLambda.lighthouseHandler,
      keywordGeneratorApiHandler: this.lambda.keywordGeneratorApiHandler,
      bedrockAgentHandler: this.lambda.bedrockAgentHandler,
      environment,
    });

    // Add stack outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'NeuralynxAPIEndpoint',
    });

    new cdk.CfnOutput(this, 'APIDocumentation', {
      value: `${this.api.api.url}docs`,
      description: 'API Documentation (Swagger UI)',
      exportName: 'NeuralynxAPIDocumentation',
    });

    new cdk.CfnOutput(this, 'SwaggerJSON', {
      value: `${this.api.api.url}swagger.json`,
      description: 'Swagger JSON specification',
      exportName: 'NeuralynxSwaggerJSON',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: this.cognito.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'NeuralynxCognitoUserPoolId',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: this.cognito.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'NeuralynxCognitoUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'DatabaseTableName', {
      value: this.database.domainTable.tableName,
      description: 'DynamoDB Domain table name',
      exportName: 'NeuralynxDatabaseTableName',
    });
  }
}
