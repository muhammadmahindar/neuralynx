import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ContainerLambdaConstructProps {
  domainTable?: dynamodb.Table;
  contentTable?: dynamodb.Table;
  crawlResultsBucket?: s3.Bucket;
  environment?: string;
}

export class ContainerLambdaConstruct extends Construct {
  public readonly domainCrawlerHandler: lambda.Function;
  public readonly domainCrawlerApiHandler: lambda.Function;
  public readonly lighthouseHandler: lambda.Function;
  public readonly contentHandler: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: ContainerLambdaConstructProps
  ) {
    super(scope, id);

    // Create the container-based Lambda function for Domain Crawler
    this.domainCrawlerHandler = new lambda.Function(
      this,
      'DomainCrawlerHandler',
      {
        runtime: lambda.Runtime.FROM_IMAGE,
        handler: lambda.Handler.FROM_IMAGE,
        code: lambda.Code.fromAssetImage(path.join(__dirname, '../../'), {
          file: 'Dockerfile.lighthouse',
        }),
        timeout: cdk.Duration.minutes(10), // Extended timeout for crawling
        memorySize: 3008, // Maximum memory for container Lambda
        environment: {
          LOCALSTACK_ENDPOINT: 'false', // Always false for AWS deployment
        },
        architecture: lambda.Architecture.X86_64, // Use x86_64 for better Chrome compatibility
      }
    );

    // Create the container-based Lambda function for Domain Crawler API
    this.domainCrawlerApiHandler = new lambda.Function(
      this,
      'DomainCrawlerApiHandler',
      {
        runtime: lambda.Runtime.FROM_IMAGE,
        handler: lambda.Handler.FROM_IMAGE,
        code: lambda.Code.fromAssetImage(path.join(__dirname, '../../'), {
          file: 'Dockerfile.lighthouse',
        }),
        timeout: cdk.Duration.minutes(10), // Extended timeout for crawling
        memorySize: 3008, // Maximum memory for container Lambda
        environment: {
          LOCALSTACK_ENDPOINT: 'false', // Always false for AWS deployment
          DOMAIN_TABLE_NAME: 'Domain',
          CONTENT_TABLE_NAME: 'Content',
          DOMAIN_EVENTS_TOPIC_ARN: '',
          KEYWORDS_TABLE_NAME: 'neuralynx-keywords',
          ERROR_LOGS_TABLE_NAME: 'neuralynx-error-logs',
          CRAWL_RESULTS_BUCKET_NAME: props.crawlResultsBucket?.bucketName || '',
          ENVIRONMENT: props.environment || 'dev',
        },
        architecture: lambda.Architecture.X86_64, // Use x86_64 for better Chrome compatibility
      }
    );

    // Create the container-based Lambda function for Lighthouse
    this.lighthouseHandler = new lambda.Function(this, 'LighthouseHandler', {
      runtime: lambda.Runtime.FROM_IMAGE,
      handler: lambda.Handler.FROM_IMAGE,
      code: lambda.Code.fromAssetImage(path.join(__dirname, '../../'), {
        file: 'Dockerfile.lighthouse',
      }),
      timeout: cdk.Duration.minutes(10), // Extended timeout for Lighthouse
      memorySize: 3008, // Maximum memory for container Lambda
      environment: {
        LOCALSTACK_ENDPOINT: 'false', // Always false for AWS deployment
      },
      architecture: lambda.Architecture.X86_64, // Use x86_64 for better Chrome compatibility
    });

    // Create the container-based Lambda function for Content Handler
    this.contentHandler = new lambda.Function(this, 'ContentHandler', {
      runtime: lambda.Runtime.FROM_IMAGE,
      handler: lambda.Handler.FROM_IMAGE,
      code: lambda.Code.fromAssetImage(path.join(__dirname, '../../'), {
        file: 'Dockerfile.lighthouse',
      }),
      timeout: cdk.Duration.minutes(10), // Extended timeout for crawling
      memorySize: 3008, // Maximum memory for container Lambda
      environment: {
        LOCALSTACK_ENDPOINT: 'false', // Always false for AWS deployment
        DOMAIN_TABLE_NAME: 'Domain',
        CONTENT_TABLE_NAME: 'Content',
        DOMAIN_EVENTS_TOPIC_ARN: '',
        KEYWORDS_TABLE_NAME: 'neuralynx-keywords',
        ERROR_LOGS_TABLE_NAME: 'neuralynx-error-logs',
        CRAWL_RESULTS_BUCKET_NAME: props.crawlResultsBucket?.bucketName || '',
        ENVIRONMENT: props.environment || 'dev',
      },
      architecture: lambda.Architecture.X86_64, // Use x86_64 for better Chrome compatibility
    });

    // Grant DynamoDB permissions if table is provided
    if (props.domainTable) {
      props.domainTable.grantReadWriteData(this.domainCrawlerHandler);
      props.domainTable.grantReadWriteData(this.domainCrawlerApiHandler);
      props.domainTable.grantReadWriteData(this.lighthouseHandler);
      props.domainTable.grantReadWriteData(this.contentHandler);
    }

    if (props.contentTable) {
      props.contentTable.grantReadWriteData(this.domainCrawlerApiHandler);
      props.contentTable.grantReadWriteData(this.contentHandler);
    }

    // Grant S3 permissions if bucket is provided
    if (props.crawlResultsBucket) {
      props.crawlResultsBucket.grantReadWrite(this.domainCrawlerHandler);
      props.crawlResultsBucket.grantReadWrite(this.domainCrawlerApiHandler);
      props.crawlResultsBucket.grantReadWrite(this.lighthouseHandler);
      props.crawlResultsBucket.grantReadWrite(this.contentHandler);
    }

    // Grant SSM parameter access
    this.setupSSMPermissions();
  }

  private setupSSMPermissions(): void {
    const ssmPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
      ],
      resources: ['arn:aws:ssm:*:*:parameter/neuralynx/*'],
    });

    this.domainCrawlerHandler.addToRolePolicy(ssmPolicy);
    this.domainCrawlerApiHandler.addToRolePolicy(ssmPolicy);
    this.lighthouseHandler.addToRolePolicy(ssmPolicy);
    this.contentHandler.addToRolePolicy(ssmPolicy);
  }

  public setContentTable(contentTable: dynamodb.Table): void {
    contentTable.grantReadWriteData(this.domainCrawlerApiHandler);
    contentTable.grantReadWriteData(this.contentHandler);
  }

  public setDomainTable(domainTable: dynamodb.Table): void {
    domainTable.grantReadWriteData(this.domainCrawlerHandler);
    domainTable.grantReadWriteData(this.domainCrawlerApiHandler);
    domainTable.grantReadWriteData(this.lighthouseHandler);
    domainTable.grantReadWriteData(this.contentHandler);
  }
}
