import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client } from '@aws-sdk/client-s3';
import { AWSConstants } from '../core/common/constants';

@Injectable()
export class AwsConfig {
  private readonly sqs: SQSClient;
  private readonly s3: S3Client;

  constructor(private configService: ConfigService) {
    const awsAccessKey = this.configService.get<string>(
      'client_aws_access_key',
    );
    const awsSecretKey = this.configService.get<string>(
      'client_aws_secret_key',
    );

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
      region: AWSConstants.AWS_REGION,
    });

    this.sqs = new SQSClient({
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
      region: AWSConstants.AWS_REGION,
    });
  }

  getSqs() {
    return this.sqs;
  }

  getS3() {
    return this.s3;
  }
}
