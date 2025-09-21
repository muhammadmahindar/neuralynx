import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export interface SnsConstructProps {
  environment: string;
}

export class SnsConstruct extends Construct {
  public readonly domainEventsTopic: sns.Topic;
  public readonly deadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: SnsConstructProps) {
    super(scope, id);

    // Create dead letter queue for failed message processing
    this.deadLetterQueue = new sqs.Queue(this, 'DomainEventsDLQ', {
      queueName: `neuralynx-domain-events-dlq-${props.environment}`,
      retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
      visibilityTimeout: cdk.Duration.minutes(15), // Allow time for debugging
    });

    // Create SNS topic for domain events
    this.domainEventsTopic = new sns.Topic(this, 'DomainEventsTopic', {
      topicName: `neuralynx-domain-events-${props.environment}`,
      displayName: 'Neuralynx Domain Events',
    });

    // Add subscription for dead letter queue
    this.domainEventsTopic.addSubscription(
      new SqsSubscription(this.deadLetterQueue, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['DEAD_LETTER'],
          }),
        },
      })
    );

    // Create topic policy for cross-account access if needed
    this.domainEventsTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
        actions: ['sns:Publish'],
        resources: [this.domainEventsTopic.topicArn],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': cdk.Stack.of(this).account,
          },
        },
      })
    );
  }

  /**
   * Grant publish permissions to a lambda function
   */
  public grantPublishToLambda(lambdaFunction: NodejsFunction): void {
    this.domainEventsTopic.grantPublish(lambdaFunction);
  }

  /**
   * Grant subscribe permissions to a lambda function
   */
  public grantSubscribeToLambda(lambdaFunction: NodejsFunction): void {
    this.domainEventsTopic.grantSubscribe(lambdaFunction);
  }

  /**
   * Create SNS subscription for a lambda function
   */
  public addLambdaSubscription(
    lambdaFunction: NodejsFunction,
    filterPolicy?: { [key: string]: sns.SubscriptionFilter }
  ): sns.Subscription {
    return this.domainEventsTopic.addSubscription(
      new LambdaSubscription(lambdaFunction, {
        filterPolicy,
        deadLetterQueue: this.deadLetterQueue,
      })
    );
  }

  /**
   * Get the topic ARN for environment variables
   */
  public getTopicArn(): string {
    return this.domainEventsTopic.topicArn;
  }
}
