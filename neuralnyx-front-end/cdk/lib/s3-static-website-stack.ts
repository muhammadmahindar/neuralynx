import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
} from "aws-cdk-lib";

export class S3StaticWebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const DOMAIN_NAME = "hackathon-bucket-1030";

    // Create an S3 bucket to host the static website
    const bucket = new s3.Bucket(this, "StaticWebsiteBucket", {
      bucketName: DOMAIN_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      versioned: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
    });

    // Create a CloudFront distribution
    const cdn = new cloudfront.Distribution(this, "StaticSiteCDN", {
      defaultBehavior: {
        origin: new origins.HttpOrigin(bucket.bucketWebsiteDomainName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          httpPort: 80,
          httpsPort: 443,
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
      },
    });

    // Deploy website files to S3 and invalidate CloudFront cache
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset("./website")], // Path to the directory containing the built website files
      destinationBucket: bucket,
      distribution: cdn, // Automatically invalidate CloudFront cache
      distributionPaths: ["/*"], // Invalidate all paths
    });

    // Output the CloudFront domain name
    new cdk.CfnOutput(this, "StaticSiteCDNDomain", {
      value: cdn.domainName,
    });

    // Output the S3 bucket website URL
    new cdk.CfnOutput(this, "StaticSiteBucketURL", {
      value: bucket.bucketWebsiteUrl,
    });
  }
}
