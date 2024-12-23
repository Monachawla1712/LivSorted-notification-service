import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEntity } from './campaign.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { LogEntity } from '../notification/log.entity';
import { CommonService } from '../core/common/common.service';
import { UserEntity } from '../notification/user.entity';
import { BulkUploadEntity } from '../notification/bulk-upload.entity';
import { TemplateService } from '../template/template.service';
import { TemplateEntity } from '../template/template.entity';
import { ConfigService } from '@nestjs/config';
import { RestApiService } from '../core/common/rest-api-service';
import { InAppService } from '../in-app/in-app.service';
import { ClientService } from '../core/client/client.service';
import { NotificationParamsService } from '../notification-params/notification-params.service';
import { NotificationParamsEntity } from '../notification-params/notification-params.entity';
import { HttpModule } from '@nestjs/axios';
import { PnService } from '../pn/pn.service';
import { ClevertapService } from '../clevertap/clevertap.service';
import { SmsService } from '../sms/sms.service';
import { AwsService } from '../core/common/aws.service';
import { AwsConfig } from '../config/aws.config';
import { ClevertapEntity } from '../clevertap/clevertap.entity';
import { NotificationQueueService } from './notification.queue.service';
import { NotificationQueueEntity } from './notification.queue.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignEntity,
      LogEntity,
      UserEntity,
      BulkUploadEntity,
      TemplateEntity,
      NotificationParamsEntity,
      ClevertapEntity,
      NotificationQueueEntity,
    ]),
    HttpModule,
  ],
  controllers: [CampaignController],
  providers: [
    CampaignService,
    CommonService,
    NotificationQueueService,
    TemplateService,
    ConfigService,
    RestApiService,
    InAppService,
    ClientService,
    ClevertapService,
    SmsService,
    PnService,
    AwsService,
    AwsConfig,
    NotificationParamsService,
    WhatsappService,
  ],
})
export class CampaignModule {}
