import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClevertapEntity } from './clevertap.entity';
import { ClevertapService } from './clevertap.service';
import { ClevertapController } from './clevertap.controller';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CommonService } from 'src/core/common/common.service';
import { TemplateService } from 'src/template/template.service';
import { NotificationParamsService } from 'src/notification-params/notification-params.service';
import { LogEntity } from 'src/notification/log.entity';
import { UserEntity } from 'src/notification/user.entity';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';
import { TemplateEntity } from 'src/template/template.entity';
import { NotificationParamsEntity } from 'src/notification-params/notification-params.entity';
import { RestApiService } from '../core/common/rest-api-service';
import { AwsService } from '../core/common/aws.service';
import { AwsConfig } from '../config/aws.config';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      ClevertapEntity,
      LogEntity,
      UserEntity,
      BulkUploadEntity,
      TemplateEntity,
      NotificationParamsEntity,
    ]),
  ],
  controllers: [ClevertapController],
  providers: [
    ClevertapService,
    ConfigService,
    CommonService,
    TemplateService,
    RestApiService,
    NotificationParamsService,
    AwsService,
    AwsConfig,
  ],
})
export class ClevertapModule {}
