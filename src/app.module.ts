import { CallModule } from './call/call.module';

require('newrelic');
import { AsyncContextModule } from '@nestjs-steroids/async-context';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { LogEntity } from './notification/log.entity';
import { TemplateEntity } from './template/template.entity';
import { ClevertapEntity } from './clevertap/clevertap.entity';
import { SmsModule } from './sms/sms.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { EmailModule } from './email/email.module';
import { ClevertapModule } from './clevertap/clevertap.module';
import { UserEntity } from './notification/user.entity';
import { TemplateModule } from './template/template.module';
import { CommonModule } from './core/common/common.module';
import { PnModule } from './pn/pn.module';
import { PrivilegeHandlerInterceptor } from './core/privilege.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingMiddleware } from './core/logging.middleware';
import { PrivilegeEndpointsEntity } from './privilege/entity/privilege-endpoints.entity';
import { PrivilegeService } from './privilege/privilege.service';
import { NotificationParamsEntity } from './notification-params/notification-params.entity';
import { InAppModule } from './in-app/in-app.module';
import { BulkUploadEntity } from './notification/bulk-upload.entity';
import { CampaignEntity } from './campaign/campaign.entity';
import { CampaignModule } from './campaign/campaign.module';
import { NotificationQueueEntity } from './campaign/notification.queue.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: 5432,
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: 'postgres',
        entities: [
          LogEntity,
          TemplateEntity,
          ClevertapEntity,
          UserEntity,
          PrivilegeEndpointsEntity,
          NotificationParamsEntity,
          BulkUploadEntity,
          CampaignEntity,
          NotificationQueueEntity,
        ],
        logging: false,
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    TemplateModule,
    ClevertapModule,
    PnModule,
    EmailModule,
    SmsModule,
    WhatsappModule,
    CallModule,
    InAppModule,
    CampaignModule,
    TypeOrmModule.forFeature([PrivilegeEndpointsEntity]),
    AsyncContextModule.forRoot(),
  ],
  controllers: [],
  providers: [
    LoggingMiddleware,
    PrivilegeService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrivilegeHandlerInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
