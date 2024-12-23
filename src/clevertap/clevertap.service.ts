import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClevertapEntity } from './clevertap.entity';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ClevertapEventRequestDto } from './dto/clevertap-event-request.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CommonService } from 'src/core/common/common.service';
import { TemplateService } from 'src/template/template.service';
import { NotificationChannel } from 'src/core/enums/notification.channel';
import { NotificationStatus } from 'src/core/enums/notification.status';
import { NotificationParamsService } from 'src/notification-params/notification-params.service';
import { LogEntity } from 'src/notification/log.entity';
import { ClevertapNotificationRequestDto } from './dto/clevertap-notification-request.dto';
import { ClevertapProfileUpdateRequestDto } from './dto/clevertap-profile-update-request.dto';
import { Endpoints } from '../core/common/constants';

@Injectable()
export class ClevertapService {
  private readonly logger = new CustomLogger(ClevertapService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private configService: ConfigService<Config, true>,
    private httpService: HttpService,
    @InjectRepository(ClevertapEntity)
    private readonly clevertapRepository: Repository<ClevertapEntity>,
    private commonService: CommonService,
    private templateService: TemplateService,
    private notificationParamService: NotificationParamsService,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  private async sendCleverTapRequest(request: any, url: string) {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL: this.configService.get<string>('clevertap_url'),
          url: url,
          headers: {
            'content-type': 'application/json',
            'X-CleverTap-Account-Id': this.configService.get<string>(
              'clevertap_account_id',
            ),
            'X-CleverTap-Passcode':
              this.configService.get<string>('clevertap_passcode'),
          },
          data: request,
        }),
      );
      await this.clevertapRepository.save({
        request: request,
        response: resp.data,
      });
      return resp.status;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        `Error while sending clevertap request ${request}`,
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while sending clevertap request.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendEvent(request: ClevertapEventRequestDto) {
    return this.sendCleverTapRequest(
      request,
      Endpoints.CLEVERTAP_EVENT_REQUEST,
    );
  }

  async sendProfileUpdate(request: ClevertapProfileUpdateRequestDto) {
    return this.sendCleverTapRequest(
      request,
      Endpoints.CLEVERTAP_PROFILE_REQUEST,
    );
  }

  async sendEventNotification(request) {
    return this.sendCleverTapRequest(
      request,
      Endpoints.CLEVERTAP_NOTIFICATION_REQUEST,
    );
  }

  async sendClevertapNotifications(
    requests: ClevertapNotificationRequestDto[],
  ) {
    let failedCount = 0;
    let successCount = 0;
    let userIds = [];
    const failedRequests = [];
    for (const request of requests) {
      try {
        await this.sendClevertapNotification(request);
        successCount++;
        userIds.push(request.userId);
      } catch (e) {
        this.logger.error(
          this.asyncContext.get('traceId'),
          `Error while sending clevertap pn request ${request}`,
          e,
        );
        failedCount++;
        failedRequests.push({
          message: e,
          request: request,
        });
      }
    }
    if (failedCount == 0) {
      return {
        success: true,
        userIds: userIds,
        message:
          successCount.toString() +
          '/' +
          (failedCount + successCount).toString() +
          ' notifications sent successfully',
      };
    } else {
      return {
        success: false,
        message:
          failedCount.toString() +
          '/' +
          (failedCount + successCount).toString() +
          ' notifications sent unsuccessfully',
        failedRequests: failedRequests,
        userIds: failedRequests.map((r) => r.request.userId),
      };
    }
  }

  async sendClevertapNotification(request: ClevertapNotificationRequestDto) {
    const template = request.templateId
      ? await this.templateService.getTemplateById(request.templateId)
      : await this.templateService.getTemplateByName(request.templateName);

    if (template.channel != NotificationChannel.PN) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const obj = {
      to: {
        Identity: [request.userId],
      },
      respect_frequency_caps: false,
      content: {
        title: this.commonService.replaceFillers(
          template.title,
          request.fillers,
        ),
        body: this.commonService.replaceFillers(template.body, request.fillers),
        platform_specific: {
          ios: {
            launchUrl: template.metadata?.url,
            'mutable-content': 'true',
            default_sound: true,
            ct_mediaUrl: template.metadata?.image,
          },
          android: {
            wzrk_cid: 'onboarding',
            wzrk_bp: template.metadata?.image,
            default_sound: true,
            wzrk_dl: template.metadata?.url,
          },
        },
      },
    };

    const status = await this.sendEventNotification(obj);

    const expiryDate: Date = this.commonService.calculateDateForValidity(
      template.metadata.valid_days,
      template.metadata.valid_hours,
    );

    const userIdentity = (
      await this.commonService.getUserIdentity(request.userId, template.channel)
    ).identity;

    await this.logRepository.save({
      user_id: request.userId,
      user_identity: userIdentity,
      template_id: template.id,
      template_name: template.name,
      channel: template.channel,
      title: obj.content?.title,
      body: obj.content?.body,
      status:
        status == 200 ? NotificationStatus.SENT : NotificationStatus.FAILED,
      metadata: template.metadata,
      expiry: expiryDate,
      campaign_id: request.campaignId,
    });

    if (status != 200) {
      throw new HttpException(
        { message: 'Something went wrong while sending clevertap pn request.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      message: 'clevertap pn sent successfully',
    };
  }
}
