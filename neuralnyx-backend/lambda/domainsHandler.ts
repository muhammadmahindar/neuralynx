import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { DomainService, GetDomainsOptions } from './services/domainService';
import {
  HttpResponse,
  ValidationError,
  validateRequestBody,
  getAuthenticatedUser,
} from './utils/httpResponses';
import { S3, SSM } from 'aws-sdk';

interface CreateDomainRequest {
  domain: string;
}

interface UpdateBusinessSummaryRequest {
  businessSummary: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('🚀 Domains Handler: Starting processing...');
  console.log('📋 Domains Handler: Event details:', {
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers,
  });

  try {
    // Get authenticated user
    const user = getAuthenticatedUser(event);
    const userId = user.userId;
    console.log('👤 Domains Handler: Authenticated user ID:', userId);

    // Initialize domain service
    const domainService = new DomainService();
    console.log('🔧 Domains Handler: Domain service initialized');

    // Handle different HTTP methods
    if (event.httpMethod === 'GET') {
      return await handleCollectionOperation(event, domainService, userId);
    } else if (event.httpMethod === 'POST') {
      return await handleCreateDomainOperation(event, domainService, userId);
    } else if (event.httpMethod === 'PATCH' && event.pathParameters?.domain) {
      return await handleUpdateBusinessSummaryOperation(
        event,
        domainService,
        userId,
        event.pathParameters.domain
      );
    } else if (event.httpMethod === 'DELETE' && event.pathParameters?.domain) {
      return await handleIndividualDomainOperation(
        event,
        domainService,
        userId,
        event.pathParameters.domain
      );
    } else {
      return HttpResponse.methodNotAllowed(['GET', 'POST', 'PATCH', 'DELETE']);
    }
  } catch (error) {
    console.error('❌ Domains Handler: Unexpected error:', error);
    return HttpResponse.internalServerError('Internal server error');
  }
};

// Handle update business summary operation
async function handleUpdateBusinessSummaryOperation(
  event: APIGatewayProxyEvent,
  domainService: DomainService,
  userId: string,
  domainName: string
) {
  try {
    console.log(
      `📝 Domains Handler: Updating business summary for domain: ${domainName}`
    );
    const requestBody: UpdateBusinessSummaryRequest = validateRequestBody(event.body);
    const { businessSummary } = requestBody;

    console.log(
      `🏗️ Domains Handler: Updating business summary for domain: ${domainName} for user: ${userId}`
    );

    const updatedDomain = await domainService.updateBusinessSummary(
      userId,
      domainName,
      businessSummary
    );

    console.log(
      '✅ Domains Handler: Business summary updated successfully:',
      updatedDomain
    );

    return HttpResponse.ok({
      domain: updatedDomain.domain,
      businessSummary: updatedDomain.businessSummary,
      updatedAt: updatedDomain.updatedAt,
    });
  } catch (error) {
    console.error('❌ Domains Handler: Error updating business summary:', error);

    if (error instanceof ValidationError) {
      console.log(
        '⚠️ Domains Handler: Validation error - invalid business summary'
      );
      return HttpResponse.badRequest(`Invalid business summary: ${error.message}`);
    }

    return HttpResponse.internalServerError('Failed to update business summary');
  }
}

// Handle create domain operation
async function handleCreateDomainOperation(
  event: APIGatewayProxyEvent,
  domainService: DomainService,
  userId: string
) {
  try {
    console.log('📝 Domains Handler: Creating new domain...');
    const requestBody: CreateDomainRequest = validateRequestBody(event.body);
    const { domain } = requestBody;

    console.log(
      `🏗️ Domains Handler: Creating domain: ${domain} for user: ${userId}`
    );

    const domainRecord = await domainService.createDomain({
      userId,
      domain,
    });

    console.log(
      '✅ Domains Handler: Domain created successfully:',
      domainRecord
    );

    return HttpResponse.created({
      domain: domainRecord.domain,
      isActive: domainRecord.isActive,
      createdAt: domainRecord.createdAt,
    });
  } catch (error) {
    console.error('❌ Domains Handler: Error creating domain:', error);

    if (error instanceof ValidationError) {
      console.log(
        '⚠️ Domains Handler: Validation error - domain already exists'
      );
      return HttpResponse.badRequest(`Domain already exists: ${error.message}`);
    }

    return HttpResponse.internalServerError('Failed to create domain');
  }
}

// Handle collection operations (/domains)
async function handleCollectionOperation(
  event: APIGatewayProxyEvent,
  domainService: DomainService,
  userId: string
) {
  console.log('📋 Domains Handler: Handling collection operation...');

  // Parse query parameters
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit)
    : undefined;
  const offset = event.queryStringParameters?.offset
    ? parseInt(event.queryStringParameters.offset)
    : undefined;
  const active = event.queryStringParameters?.active
    ? event.queryStringParameters.active === 'true'
    : undefined;
  const search = event.queryStringParameters?.search;

  console.log('🔍 Domains Handler: Query parameters:', {
    limit,
    offset,
    active,
    search,
  });

  const options: GetDomainsOptions = {
    limit,
    offset,
    active,
    search,
  };

  const domains = await domainService.getUserDomains(userId, options);

  // Generate presigned URLs for sitemap and crawl data
  const domainsWithPresignedUrls = await Promise.all(
    domains.map(async (domain) => {
      let updatedDomain = { ...domain };

      try {
        const isLocalStack = process.env.LOCALSTACK_ENDPOINT === 'true';
        const ssm = new SSM({
          ...(isLocalStack && {
            endpoint: 'http://ssm.localhost.localstack.cloud:4566',
            region: 'us-east-1', // LocalStack uses us-east-1
            credentials: {
              accessKeyId: 'test',
              secretAccessKey: 'test',
            },
          }),
          // For AWS Lambda, don't specify region or credentials - let AWS SDK auto-detect
        });

        const bucketNameParam = await ssm
          .getParameter({
            Name: '/neuralynx/domain-crawler/bucket-name',
          })
          .promise();

        const bucketName = bucketNameParam.Parameter?.Value;
        if (bucketName) {
          const s3 = new S3({
            ...(isLocalStack && {
              endpoint: 'http://s3.localhost.localstack.cloud:4566',
              s3ForcePathStyle: true,
              region: 'us-east-1', // LocalStack uses us-east-1
              credentials: {
                accessKeyId: 'test',
                secretAccessKey: 'test',
              },
            }),
            // For AWS Lambda, don't specify region or credentials - let AWS SDK auto-detect
          });

          // Generate presigned URL for sitemap data
          if (domain.sitemapResults?.s3Key) {
            const sitemapPresignedUrl = s3.getSignedUrl('getObject', {
              Bucket: bucketName,
              Key: domain.sitemapResults.s3Key,
              Expires: 3600, // 1 hour
            });

            updatedDomain = {
              ...updatedDomain,
              sitemapResults: {
                ...domain.sitemapResults,
                presignedUrl: sitemapPresignedUrl,
              } as any,
            };
          }

          // Generate presigned URLs for crawl data
          if (domain.crawlResults?.s3BaseKey) {
            const crawlDataUrl = s3.getSignedUrl('getObject', {
              Bucket: bucketName,
              Key: `${domain.crawlResults.s3BaseKey}/content.html`,
              Expires: 3600, // 1 hour
            });

            const crawlResultsWithUrl: any = {
              ...domain.crawlResults,
              crawlDataUrl,
            };

            updatedDomain = {
              ...updatedDomain,
              crawlResults: crawlResultsWithUrl,
            };
          }

          // Handle lighthouse results (new structure)
          if (domain.lighthouseResults?.s3Key) {
            // Lighthouse results already have presigned URL from the lighthouse handler
            // No need to regenerate it here
            updatedDomain = {
              ...updatedDomain,
              lighthouseResults: domain.lighthouseResults,
            };
          }
        }
      } catch (error) {
        console.error('Error generating presigned URLs:', error);
      }

      return updatedDomain;
    })
  );

  // Return only essential domain data
  const optimizedDomains = domainsWithPresignedUrls.map((domain) => ({
    domain: domain.domain,
    isActive: domain.isActive,
    businessSummary: domain.businessSummary,
    businessAnalysis: domain.businessAnalysis,
    lastCrawledAt: domain.lastCrawledAt,
    crawlResults: domain.crawlResults
      ? {
          totalPages: domain.crawlResults.totalPages,
          presignedUrl: (domain as any).crawlResults?.crawlDataUrl,
        }
      : undefined,
    markdownResults: domain.markdownResults
      ? {
          wordCount: domain.markdownResults.wordCount,
          generatedAt: domain.markdownResults.generatedAt,
          presignedUrl: domain.markdownResults.presignedUrl,
        }
      : undefined,
    sitemapResults: domain.sitemapResults
      ? {
          totalUrls: domain.sitemapResults.totalUrls,
          presignedUrl: (domain as any).sitemapResults?.presignedUrl,
        }
      : undefined,
    lighthouseResults: domain.lighthouseResults
      ? {
          presignedUrl: domain.lighthouseResults.presignedUrl,
          s3Key: domain.lighthouseResults.s3Key,
          bucket: domain.lighthouseResults.bucket,
        }
      : undefined,
  }));

  return HttpResponse.ok(optimizedDomains);
}

// Handle individual domain operations (/domains/{domain})
async function handleIndividualDomainOperation(
  event: APIGatewayProxyEvent,
  domainService: DomainService,
  userId: string,
  domainName: string
) {
  console.log(
    `🔍 Domains Handler: Handling individual domain operation for: ${domainName}`
  );

  if (event.httpMethod === 'DELETE') {
    console.log(`🗑️ Domains Handler: Deleting domain: ${domainName}`);

    try {
      await domainService.deleteDomain(userId, domainName);
      console.log(
        `✅ Domains Handler: Domain deleted successfully: ${domainName}`
      );

      return HttpResponse.noContent();
    } catch (error) {
      console.error(
        `❌ Domains Handler: Error deleting domain ${domainName}:`,
        error
      );

      if (error instanceof ValidationError) {
        return HttpResponse.badRequest(
          `Failed to delete domain: ${error.message}`
        );
      }

      return HttpResponse.internalServerError('Failed to delete domain');
    }
  } else {
    return HttpResponse.methodNotAllowed(['DELETE']);
  }
}
