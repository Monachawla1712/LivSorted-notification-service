import { Injectable } from '@nestjs/common';
import {
  SendMessageCommand,
  SendMessageCommandOutput,
} from '@aws-sdk/client-sqs';
import { AwsConfig } from '../../config/aws.config';
import { CustomLogger } from '../custom-logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NotificationParamsService } from '../../notification-params/notification-params.service';

@Injectable()
export class AwsService {
  private readonly logger = new CustomLogger(AwsService.name);

  constructor(
    private readonly awsConfig: AwsConfig,
    private paramService: NotificationParamsService,
  ) {}

  async sendMessage(
    queueUrl: string,
    messageBody: string,
    delayInSeconds: number | null = null,
  ): Promise<SendMessageCommandOutput> {
    const params: any = {
      QueueUrl: queueUrl,
      MessageBody: messageBody,
    };

    if (delayInSeconds !== null) {
      params.DelaySeconds = delayInSeconds;
    }

    try {
      const command = new SendMessageCommand(params);
      const response = await this.awsConfig.getSqs().send(command);
      this.logger.log('Message sent successfully.', response.MessageId);
      return response;
    } catch (error) {
      this.logger.error(
        'Some error occurred while sending message to SQS',
        error,
      );
      throw error;
    }
  }

  async uploadFile(file, folder: string): Promise<string> {
    const bucketName = await this.paramService.getStringParamValue(
      'S3_BUCKET_NAME',
      'files-sorted-dev',
    );
    const params = {
      Bucket: bucketName,
      Key: `${folder}/${this.generateFileName(file)}`,
      Body: file.buffer,
    };

    try {
      const command = new PutObjectCommand(params);
      const cloudFrontBaseUrl = await this.paramService.getStringParamValue(
        'CLOUDFRONT_BASE_URL',
        '',
      );
      await this.awsConfig.getS3().send(command);
      this.logger.log('File uploaded successfully.', params.Key);
      return `${cloudFrontBaseUrl}/${params.Key}`;
    } catch (error) {
      this.logger.error(
        'Some error occurred while uploading file to S3',
        error,
      );
      throw error;
    }
  }

  generateFileName(file) {
    return `${Date.now()}_${file.originalname}`;
  }
}
