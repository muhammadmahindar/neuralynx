import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { AttributeValue } from 'aws-sdk/clients/dynamodb';
import { SNS } from 'aws-sdk';

export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
) => {
  console.log('DynamoDB Stream Event:', JSON.stringify(event, null, 2));

  const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
  const sns = new SNS({
    ...(isLocalStack && {
      endpoint: 'http://sns.localhost.localstack.cloud:4566',
      region: 'us-east-1', // LocalStack uses us-east-1
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    }),
    // For AWS Lambda, don't specify region or credentials - let AWS SDK auto-detect
  });

  for (const record of event.Records) {
    console.log('Processing record:', JSON.stringify(record, null, 2));

    // Check if this is an INSERT event (new domain added)
    if (record.eventName === 'INSERT') {
      const newImage = record.dynamodb?.NewImage;
      if (newImage) {
        const domain = unmarshallDynamoDBItem(newImage);
        console.log('🎉 New domain added:', {
          userId: domain.userId,
          domain: domain.domain,
          createdAt: domain.createdAt,
          isActive: domain.isActive,
        });

        // Publish domain created event to SNS
        await publishDomainEvent(sns, 'DOMAIN_CREATED', domain);
      }
    } else if (record.eventName === 'MODIFY') {
      const newImage = record.dynamodb?.NewImage;
      const oldImage = record.dynamodb?.OldImage;
      if (newImage && oldImage) {
        const newDomain = unmarshallDynamoDBItem(newImage);
        const oldDomain = unmarshallDynamoDBItem(oldImage);
        console.log('🔄 Domain updated:', {
          userId: newDomain.userId,
          domain: newDomain.domain,
          changes: getDomainChanges(oldDomain, newDomain),
        });

        // DOMAIN_UPDATED events removed to prevent multiple Lambda invocations
        // Only DOMAIN_CREATED and DOMAIN_DELETED events are published now
      }
    } else if (record.eventName === 'REMOVE') {
      const oldImage = record.dynamodb?.OldImage;
      if (oldImage) {
        const domain = unmarshallDynamoDBItem(oldImage);
        console.log('🗑️ Domain deleted:', {
          userId: domain.userId,
          domain: domain.domain,
          deletedAt: new Date().toISOString(),
        });

        // Publish domain deleted event to SNS
        await publishDomainEvent(sns, 'DOMAIN_DELETED', domain);
      }
    }
  }
};

/**
 * Convert DynamoDB AttributeValue to JavaScript object
 */
function unmarshallDynamoDBItem(item: { [key: string]: AttributeValue }): any {
  const result: any = {};

  for (const [key, value] of Object.entries(item)) {
    if (value.S) {
      result[key] = value.S;
    } else if (value.N) {
      result[key] = Number(value.N);
    } else if (value.BOOL !== undefined) {
      result[key] = value.BOOL;
    } else if (value.SS) {
      result[key] = value.SS;
    } else if (value.NS) {
      result[key] = value.NS.map((n) => Number(n));
    } else if (value.BS) {
      result[key] = value.BS;
    } else if (value.L) {
      result[key] = value.L.map((item) => unmarshallDynamoDBItem({ item }));
    } else if (value.M) {
      result[key] = unmarshallDynamoDBItem(value.M);
    } else if (value.NULL) {
      result[key] = null;
    }
  }

  return result;
}

async function publishDomainEvent(
  sns: SNS,
  eventType: string,
  domain: any,
  oldDomain?: any
): Promise<void> {
  try {
    const message = {
      eventType,
      domain: domain.domain,
      userId: domain.userId,
      timestamp: new Date().toISOString(),
      data: domain,
      ...(oldDomain && { previousData: oldDomain }),
    };

    await sns
      .publish({
        TopicArn: process.env.DOMAIN_EVENTS_TOPIC_ARN,
        Message: JSON.stringify(message),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          domain: {
            DataType: 'String',
            StringValue: domain.domain,
          },
          userId: {
            DataType: 'String',
            StringValue: domain.userId,
          },
        },
      })
      .promise();

    console.log(`✅ Published ${eventType} event for domain: ${domain.domain}`);
  } catch (error) {
    console.error(
      `❌ Failed to publish ${eventType} event for domain ${domain.domain}:`,
      error
    );
    throw error;
  }
}

function getDomainChanges(oldDomain: any, newDomain: any): any {
  const changes: any = {};

  // Compare key fields
  const fieldsToCheck = [
    'isActive',
    'lastCrawledAt',
    'crawlResults',
    'sitemapResults',
    'lighthouseResults',
  ];

  for (const field of fieldsToCheck) {
    if (JSON.stringify(oldDomain[field]) !== JSON.stringify(newDomain[field])) {
      changes[field] = {
        old: oldDomain[field],
        new: newDomain[field],
      };
    }
  }

  return changes;
}
