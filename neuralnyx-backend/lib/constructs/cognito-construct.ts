import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  UserPool,
  UserPoolClient,
  AccountRecovery,
} from 'aws-cdk-lib/aws-cognito';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as aws_iam from 'aws-cdk-lib/aws-iam';

export interface CognitoConstructProps {
  environment: string;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    // Create Lambda trigger for auto-confirming users
    const preSignUpTrigger = new NodejsFunction(this, 'PreSignUpTrigger', {
      entry: 'lambda/cognitoTriggers/preSignUp.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        LOCALSTACK_ENDPOINT: 'false', // Always false for AWS deployment
      },
    });

    // Grant Cognito permission to invoke the Lambda trigger
    preSignUpTrigger.addPermission('CognitoTriggerPermission', {
      principal: new aws_iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/*`,
    });

    // User Pool with email sign-in and auto-confirmation
    this.userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${props.environment}-email-password-pool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true }, // email as username
      signInCaseSensitive: false,
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      autoVerify: { email: true }, // Auto-verify email addresses
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
      // Add Lambda trigger to auto-confirm users
      lambdaTriggers: {
        preSignUp: preSignUpTrigger,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // App client for USER_PASSWORD_AUTH / SRP
    this.userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'web-client',
      authFlows: {
        userPassword: true, // USER_PASSWORD_AUTH
        userSrp: true, // SRP (Amplify/HostedUI scenarios)
      },
      preventUserExistenceErrors: true,
      generateSecret: false,
      oAuth: undefined,
    });

    // Store configuration in SSM Parameter Store
    this.createSSMParameters(props.environment);
  }

  private createSSMParameters(environment: string): void {
    new StringParameter(this, 'UserPoolIdParam', {
      parameterName: '/neuralynx/user-pool-id',
      stringValue: this.userPool.userPoolId,
      description: 'Neuralynx User Pool ID',
    });

    new StringParameter(this, 'UserPoolClientIdParam', {
      parameterName: '/neuralynx/user-pool-client-id',
      stringValue: this.userPoolClient.userPoolClientId,
      description: 'Neuralynx User Pool Client ID',
    });

    new StringParameter(this, 'EnvironmentParam', {
      parameterName: '/neuralynx/environment',
      stringValue: 'production', // Always set to production when deploying to AWS
      description: 'Deployment environment (local/production)',
    });

    new StringParameter(this, 'RegionParam', {
      parameterName: '/neuralynx/region',
      stringValue: cdk.Stack.of(this).region,
      description: 'AWS Region',
    });

    new StringParameter(this, 'CognitoIssuerParam', {
      parameterName: '/neuralynx/cognito-issuer',
      stringValue: `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: 'Cognito JWT Issuer URL',
    });
  }
}
