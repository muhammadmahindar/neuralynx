import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class ChromeLayerConstruct extends Construct {
  public readonly chromeLayer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a Lambda layer with lighthouse and playwright
    this.chromeLayer = new lambda.LayerVersion(this, 'LighthouseLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Layer containing lighthouse and playwright packages',
    });
  }
}
