import { Module } from '@nestjs/common';
import { CommonService } from '../core/common/common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LogEntity } from '../notification/log.entity';
import { TemplateEntity } from '../template/template.entity';
import { InAppController } from './in-app.controller';
import { InAppService } from './in-app.service';
import { TemplateService } from '../template/template.service';
import { UserEntity } from '../notification/user.entity';
import { ClientService } from '../core/client/client.service';
import { NotificationParamsEntity } from '../notification-params/notification-params.entity';
import { NotificationParamsService } from '../notification-params/notification-params.service';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';
import { RestApiService } from '../core/common/rest-api-service';
import { AwsService } from '../core/common/aws.service';
import { AwsConfig } from '../config/aws.config';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      LogEntity,
      UserEntity,
      TemplateEntity,
      NotificationParamsEntity,
      BulkUploadEntity,
      NotificationParamsEntity,
    ]),
  ],
  controllers: [InAppController],
  providers: [
    InAppService,
    CommonService,
    ConfigService,
    TemplateService,
    RestApiService,
    ClientService,
    NotificationParamsService,
    AwsService,
    AwsConfig,
  ],
})
export class InAppModule {}
