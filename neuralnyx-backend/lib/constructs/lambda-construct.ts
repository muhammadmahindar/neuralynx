import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Topic } from 'aws-cdk-lib/aws-sns';

export interface LambdaConstructProps {
  domainTable?: Table;
  contentTable?: Table;
  topicsTable?: Table;
  keywordsTable?: Table;
  errorLogsTable?: Table;
  crawlResultsBucket?: Bucket;
  environment: string;
  domainEventsTopic?: Topic;
}

export class LambdaConstruct extends Construct {
  public readonly signupHandler: NodejsFunction;
  public readonly loginHandler: NodejsFunction;
  public readonly refreshHandler: NodejsFunction;
  public readonly domainsHandler: NodejsFunction;
  public readonly topicsHandler: NodejsFunction;
  public readonly healthHandler: NodejsFunction;
  public readonly authorizer: NodejsFunction;
  public readonly domainStreamHandler: NodejsFunction;
  public readonly sitemapCrawlerHandler: NodejsFunction;
  public readonly sitemapCrawlerApiHandler: NodejsFunction;
  // contentHandler moved to container-lambda-construct
  public readonly keywordGeneratorApiHandler: NodejsFunction;
  public readonly bedrockAgentHandler: NodejsFunction;
  public readonly bedrockDomainAnalyzerHandler: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const functionProps: NodejsFunctionProps = {
      runtime: Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(120), // Increased from 30 to 120 seconds
      memorySize: 1024,
      architecture: Architecture.ARM_64,
      environment: {
        LOCALSTACK_ENDPOINT: 'false', // Always false for AWS deployment
        DOMAIN_TABLE_NAME: 'Domain', // Set the DynamoDB table name
        CONTENT_TABLE_NAME: 'Content', // Set the Content table name
        TOPICS_TABLE_NAME: 'Topic', // Set the Topics table name
        DOMAIN_EVENTS_TOPIC_ARN: props.domainEventsTopic?.topicArn || '',
        KEYWORDS_TABLE_NAME: 'neuralynx-keywords',
        ERROR_LOGS_TABLE_NAME: 'neuralynx-error-logs',
      },
    };

    // Create Lambda functions
    this.signupHandler = new NodejsFunction(this, 'SignupHandler', {
      entry: 'lambda/signupHandler.ts',
      ...functionProps,
    });

    this.loginHandler = new NodejsFunction(this, 'LoginHandler', {
      entry: 'lambda/loginHandler.ts',
      ...functionProps,
    });

    this.refreshHandler = new NodejsFunction(this, 'RefreshHandler', {
      entry: 'lambda/refreshHandler.ts',
      ...functionProps,
    });

    this.domainsHandler = new NodejsFunction(this, 'DomainsHandler', {
      entry: 'lambda/domainsHandler.ts',
      ...functionProps,
    });

    this.topicsHandler = new NodejsFunction(this, 'TopicsHandler', {
      entry: 'lambda/topicsHandler.ts',
      ...functionProps,
    });

    this.healthHandler = new NodejsFunction(this, 'HealthHandler', {
      entry: 'lambda/healthHandler.ts',
      ...functionProps,
    });

    this.authorizer = new NodejsFunction(this, 'Authorizer', {
      entry: 'lambda/authorizer.ts',
      ...functionProps,
    });

    // Grant Cognito permissions to authorizer
    this.authorizer.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:AdminGetUser'],
        resources: [
          `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:userpool/*`,
        ],
      })
    );

    this.domainStreamHandler = new NodejsFunction(this, 'DomainStreamHandler', {
      entry: 'lambda/domainStreamHandler.ts',
      ...functionProps,
    });

    this.sitemapCrawlerHandler = new NodejsFunction(
      this,
      'SitemapCrawlerHandler',
      {
        entry: 'lambda/sitemapCrawlerHandler.ts',
        ...functionProps,
        timeout: cdk.Duration.minutes(5), // Extended timeout for sitemap crawling
        memorySize: 1024, // Standard memory for sitemap processing
      }
    );

    this.sitemapCrawlerApiHandler = new NodejsFunction(
      this,
      'SitemapCrawlerApiHandler',
      {
        entry: 'lambda/sitemapCrawlerApiHandler.ts',
        ...functionProps,
        timeout: cdk.Duration.minutes(5), // Extended timeout for sitemap crawling
        memorySize: 1024, // Standard memory for sitemap processing
      }
    );

    this.keywordGeneratorApiHandler = new NodejsFunction(
      this,
      'KeywordGeneratorApiHandler',
      {
        entry: 'lambda/keywordGeneratorUnifiedHandler.ts',
        ...functionProps,
        timeout: cdk.Duration.minutes(5), // Extended timeout for keyword generation with Bedrock
        memorySize: 2048, // Higher memory for keyword processing and Bedrock calls
      }
    );

    this.bedrockAgentHandler = new NodejsFunction(this, 'BedrockAgentHandler', {
      entry: 'lambda/bedrockAgentHandler.ts',
      ...functionProps,
      timeout: cdk.Duration.minutes(5), // Extended timeout for Bedrock Agent interactions
      memorySize: 1024, // Standard memory for Bedrock Agent calls
      environment: {
        ...functionProps.environment,
      },
    });

    this.bedrockDomainAnalyzerHandler = new NodejsFunction(this, 'BedrockDomainAnalyzerHandler', {
      entry: 'lambda/bedrockDomainAnalyzerHandler.ts',
      ...functionProps,
      timeout: cdk.Duration.minutes(5), // Extended timeout for Bedrock domain analysis
      memorySize: 1024, // Standard memory for Bedrock calls
      environment: {
        ...functionProps.environment,
      },
    });

    // Grant DynamoDB permissions if tables are provided
    if (props.domainTable) {
      this.setupDynamoDBPermissions(props.domainTable);
    }

    if (props.topicsTable) {
      this.setupTopicsTablePermissions(props.topicsTable);
    }
    if (props.keywordsTable) {
      this.setupKeywordTablePermissions(props.keywordsTable);
    }

    if (props.errorLogsTable) {
      this.setupErrorLogsTablePermissions(props.errorLogsTable);
    }

    // Grant S3 permissions if bucket is provided
    if (props.crawlResultsBucket) {
      this.setupS3Permissions(props.crawlResultsBucket);
    }

    // Grant Lambda permissions
    this.setupLambdaPermissions();

    // Grant SSM parameter access
    this.setupSSMPermissions();
  }

  public setDomainTable(domainTable: Table): void {
    this.setupDynamoDBPermissions(domainTable);
  }

  public setContentTable(contentTable: Table): void {
    this.setupContentTablePermissions(contentTable);
  }

  public setTopicsTable(topicsTable: Table): void {
    this.setupTopicsTablePermissions(topicsTable);
  }

  public setKeywordTables(keywordsTable: Table, errorLogsTable: Table): void {
    this.setupKeywordTablePermissions(keywordsTable);
    this.setupErrorLogsTablePermissions(errorLogsTable);
  }

  public setCrawlResultsBucket(bucket: Bucket): void {
    this.setupS3Permissions(bucket);
  }

  private setupDynamoDBPermissions(domainTable: Table): void {
    domainTable.grantReadWriteData(this.domainsHandler);
    domainTable.grantReadWriteData(this.sitemapCrawlerHandler);
    domainTable.grantReadWriteData(this.sitemapCrawlerApiHandler);
  }

  private setupContentTablePermissions(contentTable: Table): void {
    contentTable.grantReadWriteData(this.sitemapCrawlerApiHandler);
    // contentHandler permissions moved to container-lambda-construct
  }

  private setupTopicsTablePermissions(topicsTable: Table): void {
    topicsTable.grantReadWriteData(this.topicsHandler);
    topicsTable.grantReadWriteData(this.keywordGeneratorApiHandler);
  }

  private setupLambdaPermissions(): void {
    // Lambda permissions are now handled by the container Lambda construct
  }

  // Removed grantInvokeToContainerLambda - no longer needed with SNS architecture

  private setupS3Permissions(bucket: Bucket): void {
    bucket.grantReadWrite(this.sitemapCrawlerHandler);
    bucket.grantReadWrite(this.sitemapCrawlerApiHandler);
  }

  private setupKeywordTablePermissions(keywordsTable: Table): void {
    keywordsTable.grantReadWriteData(this.keywordGeneratorApiHandler);
  }

  private setupErrorLogsTablePermissions(errorLogsTable: Table): void {
    errorLogsTable.grantReadWriteData(this.keywordGeneratorApiHandler);
  }

  private setupSSMPermissions(): void {
    const ssmPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
      ],
      resources: [
        `arn:aws:ssm:${cdk.Stack.of(this).region}:${
          cdk.Stack.of(this).account
        }:parameter/neuralynx/*`,
      ],
    });

    [
      this.signupHandler,
      this.loginHandler,
      this.refreshHandler,
      this.authorizer,
      this.domainsHandler,
      this.domainStreamHandler,
      this.sitemapCrawlerHandler,
      this.sitemapCrawlerApiHandler,
      this.keywordGeneratorApiHandler,
    ].forEach((func) => {
      func.addToRolePolicy(ssmPolicy);
    });

    // Add keyword generation-specific permissions
    this.setupKeywordGenerationPermissions();
  }

  private setupKeywordGenerationPermissions(): void {
    // Bedrock permissions for keyword generation
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [
        `arn:aws:bedrock:${
          cdk.Stack.of(this).region
        }::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        `arn:aws:bedrock:${
          cdk.Stack.of(this).region
        }::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
        `arn:aws:bedrock:${
          cdk.Stack.of(this).region
        }::foundation-model/anthropic.claude-3-opus-20240229-v1:0`,
      ],
    });

    // Bedrock AgentCore permissions for keyword generation
    const bedrockAgentCorePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock-agentcore:InvokeAgentRuntime'],
      resources: [
        'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/app_content-Js4Y56HdPw',
        'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/app_content-Js4Y56HdPw/runtime-endpoint/DEFAULT',
        'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/app-Ln6u4wFZmU',
        'arn:aws:bedrock-agentcore:us-east-1:309645991361:runtime/app-Ln6u4wFZmU/runtime-endpoint/DEFAULT',
      ],
    });

    this.keywordGeneratorApiHandler.addToRolePolicy(bedrockPolicy);
    this.keywordGeneratorApiHandler.addToRolePolicy(bedrockAgentCorePolicy);

    // Grant Bedrock AgentCore permissions to the new dedicated handler
    this.bedrockAgentHandler.addToRolePolicy(bedrockAgentCorePolicy);
  }
}
