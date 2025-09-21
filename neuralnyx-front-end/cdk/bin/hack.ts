#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { S3StaticWebsiteStack } from "../lib/s3-static-website-stack";

const app = new cdk.App();
new S3StaticWebsiteStack(app, "HackStack", {
  /* Use the current AWS CLI configuration for account and region */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
