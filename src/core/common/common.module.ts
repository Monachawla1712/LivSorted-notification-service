import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../notification/user.entity';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';
import { TemplateService } from '../../template/template.service';
import { TemplateEntity } from '../../template/template.entity';
import { ConfigService } from '@nestjs/config';
import { RestApiService } from './rest-api-service';
import { NotificationParamsService } from '../../notification-params/notification-params.service';
import { AwsService } from './aws.service';
import { NotificationParamsEntity } from '../../notification-params/notification-params.entity';
import { AwsConfig } from '../../config/aws.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      BulkUploadEntity,
      TemplateEntity,
      NotificationParamsEntity,
    ]),
  ],
  providers: [
    CommonService,
    TemplateService,
    ConfigService,
    RestApiService,
    NotificationParamsService,
    AwsService,
    AwsConfig,
  ],
})
export class CommonModule {}
