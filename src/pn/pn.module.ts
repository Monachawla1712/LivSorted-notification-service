import { Module } from '@nestjs/common';
import { CommonService } from '../core/common/common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LogEntity } from '../notification/log.entity';
import { TemplateEntity } from '../template/template.entity';
import { PnController } from './pn.controller';
import { PnService } from './pn.service';
import { TemplateService } from '../template/template.service';
import { UserEntity } from '../notification/user.entity';
import { ClientService } from '../core/client/client.service';
import { NotificationParamsEntity } from '../notification-params/notification-params.entity';
import { NotificationParamsService } from '../notification-params/notification-params.service';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';
import { ClevertapService } from 'src/clevertap/clevertap.service';
import { ClevertapEntity } from 'src/clevertap/clevertap.entity';
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
      BulkUploadEntity,
      NotificationParamsEntity,
      ClevertapEntity,
    ]),
  ],
  controllers: [PnController],
  providers: [
    PnService,
    RestApiService,
    CommonService,
    ConfigService,
    TemplateService,
    ClientService,
    NotificationParamsService,
    ClevertapService,
    AwsService,
    AwsConfig,
  ],
})
export class PnModule {}
