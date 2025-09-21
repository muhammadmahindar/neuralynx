import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketAccessControl,
  BlockPublicAccess,
  CorsRule,
} from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface S3ConstructProps {
  environment: string;
}

export class S3Construct extends Construct {
  public readonly crawlResultsBucket: Bucket;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    // Create S3 bucket for crawl results
    this.crawlResultsBucket = new Bucket(this, 'CrawlResultsBucket', {
      bucketName: `neuralynx-crawl-results-${props.environment}-${cdk.Stack.of(this).account}`,
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        props.environment === 'local'
          ? RemovalPolicy.DESTROY
          : RemovalPolicy.RETAIN,
      autoDeleteObjects: props.environment === 'local',
      versioned: false,
      cors: [
        {
          allowedMethods: [
            cdk.aws_s3.HttpMethods.GET,
            cdk.aws_s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteOldCrawlResults',
          enabled: true,
          expiration: cdk.Duration.days(90), // Keep crawl results for 90 days
          transitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30), // Minimum 30 days for STANDARD_IA
            },
            {
              storageClass: cdk.aws_s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(60),
            },
          ],
        },
      ],
    });
  }
}
