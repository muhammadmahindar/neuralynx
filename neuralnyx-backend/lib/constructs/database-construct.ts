import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EventSourceMapping, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Topic as SNSTopic } from 'aws-cdk-lib/aws-sns';
import { keyMap, Keys, tableMap } from '../../models/tableDecorator';
import { Domain } from '../../models/domain';
import { Content } from '../../models/content';
import { Topic } from '../../models/topic';

export interface DatabaseConstructProps {
  domainStreamHandler: NodejsFunction;
  domainEventsTopic: SNSTopic;
}

export class DatabaseConstruct extends Construct {
  public readonly domainTable: Table;
  public readonly contentTable: Table;
  public readonly topicsTable: Table;
  public readonly keywordsTable: Table;
  public readonly errorLogsTable: Table;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const domainTableName = tableMap.get(Domain)!;
    const domainPk = keyMap.get(Domain)!.get(Keys.PK)!;
    const domainSk = keyMap.get(Domain)!.get(Keys.SK)!;

    this.domainTable = new Table(this, 'Domain', {
      tableName: domainTableName,
      partitionKey: {
        name: domainPk,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: domainSk,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create event source mapping for DynamoDB stream (only for the stream handler)
    new EventSourceMapping(this, 'DomainStreamEventSource', {
      target: props.domainStreamHandler,
      eventSourceArn: this.domainTable.tableStreamArn!,
      startingPosition: StartingPosition.LATEST,
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(5),
    });

    // Create Content table for storing crawl results
    const contentTableName = tableMap.get(Content)!;
    const contentPk = keyMap.get(Content)!.get(Keys.PK)!;
    const contentSk = keyMap.get(Content)!.get(Keys.SK)!;

    this.contentTable = new Table(this, 'Content', {
      tableName: contentTableName,
      partitionKey: {
        name: contentPk,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: contentSk,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Topics table for storing topics
    const topicsTableName = tableMap.get(Topic)!;
    const topicsPk = keyMap.get(Topic)!.get(Keys.PK)!;
    const topicsSk = keyMap.get(Topic)!.get(Keys.SK)!;

    this.topicsTable = new Table(this, 'TopicsTable', {
      tableName: topicsTableName,
      partitionKey: {
        name: topicsPk,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: topicsSk,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add Global Secondary Index for querying by domain
    this.topicsTable.addGlobalSecondaryIndex({
      indexName: 'DomainIndex',
      partitionKey: {
        name: 'domain',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });

    // Create Keywords table for storing AI-generated keyword analysis
    this.keywordsTable = new Table(this, 'Keywords', {
      tableName: 'neuralynx-keywords',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'analysisId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Create Error Logs table for storing error information
    this.errorLogsTable = new Table(this, 'ErrorLogs', {
      tableName: 'neuralynx-error-logs',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'errorId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Grant SNS publish permissions to stream handler
    props.domainEventsTopic.grantPublish(props.domainStreamHandler);

    // Grant DynamoDB stream permissions to stream handler
    this.domainTable.grantStreamRead(props.domainStreamHandler);
  }
}
