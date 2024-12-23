import { Module } from '@nestjs/common';
import { CommonService } from '../core/common/common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogEntity } from '../notification/log.entity';
import { TemplateEntity } from '../template/template.entity';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TemplateService } from '../template/template.service';
import { UserEntity } from '../notification/user.entity';
import { ClientService } from '../core/client/client.service';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';
import { RestApiService } from '../core/common/rest-api-service';
import { AwsService } from '../core/common/aws.service';
import { AwsConfig } from '../config/aws.config';
import { NotificationParamsService } from '../notification-params/notification-params.service';
import { NotificationParamsEntity } from '../notification-params/notification-params.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      LogEntity,
      UserEntity,
      TemplateEntity,
      BulkUploadEntity,
      NotificationParamsEntity,
    ]),
  ],
  providers: [
    EmailService,
    CommonService,
    ConfigService,
    TemplateService,
    RestApiService,
    ClientService,
    AwsService,
    AwsConfig,
    NotificationParamsService,
  ],
  controllers: [EmailController],
})
export class EmailModule {}
