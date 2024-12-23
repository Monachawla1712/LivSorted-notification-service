import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Between,
  FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LogEntity } from '../notification/log.entity';
import { PnRequestDto } from './dto/pn.request.dto';
import { TemplateService } from '../template/template.service';
import { CommonService } from '../core/common/common.service';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { OnesignalPnRequestDto } from './dto/onesignal.pn.request.dto';
import { NotificationChannel } from '../core/enums/notification.channel';
import { NotificationStatus } from '../core/enums/notification.status';
import { ClientService } from '../core/client/client.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { ParseResult } from 'src/core/common/dto/parse-result';
import { ErrorBean } from 'src/core/common/dto/error-bean';
import { TemplateEntity } from 'src/template/template.entity';
import { NotificationParamsService } from 'src/notification-params/notification-params.service';
import { PnResponseDto } from './dto/pn.response.dto';
import { UploadBean } from '../core/common/sheet-upload/upload.bean';

@Injectable()
export class PnService {
  private readonly logger = new CustomLogger(PnService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private templateService: TemplateService,
    private commonService: CommonService,
    private clientService: ClientService,
    private notificationParamService: NotificationParamsService,
    private configService: ConfigService<Config, true>,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async sendPushNotifications(requests: PnRequestDto[]) {
    let failedCount = 0;
    let successCount = 0;
    let userIds = [];
    const failedRequests = [];
    for (const request of requests) {
      try {
        await this.sendPushNotification(request);
        successCount++;
      } catch (e) {
        this.logger.error(
          this.asyncContext.get('traceId'),
          `Error while sending pn pn request ${request}`,
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

  private async getTemplate(templateId?: string, templateName?: string) {
    const template = templateId
      ? await this.templateService.getTemplateById(templateId)
      : await this.templateService.getTemplateByName(templateName);
    if (template.channel !== NotificationChannel.PN) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return template;
  }

  private async getUserIdentity(userId: string, channel: NotificationChannel) {
    const { identity } = await this.commonService.getUserIdentity(
      userId,
      channel,
    );
    return identity;
  }

  private createOnesignalRequest(
    userId: string,
    template: any,
    fillers: any,
  ): OnesignalPnRequestDto {
    const request = new OnesignalPnRequestDto();
    request.app_id = this.configService.get<string>(
      'onesignal_consumer_app_id',
    );
    request.include_external_user_ids = [userId];
    request.channel_for_external_user_ids = 'push';
    request.headings = {
      en: this.commonService.replaceFillers(template.title, fillers),
    };
    request.contents = {
      en: this.commonService.replaceFillers(template.body, fillers),
    };
    request.big_picture = template.metadata?.image;
    request.ios_attachments = {
      id: template.metadata?.image,
    };
    request.app_url = this.commonService.replaceFillers(
      template.metadata?.url,
      fillers,
    );
    return request;
  }

  private async logNotification(params: {
    userId: string;
    userIdentity: string;
    template: any;
    title: string;
    body: string;
    status: NotificationStatus;
    campaignId?: string;
  }) {
    const expiryDate = this.commonService.calculateDateForValidity(
      params.template.metadata.valid_days,
      params.template.metadata.valid_hours,
    );
    await this.logRepository.save({
      user_id: params.userId,
      user_identity: params.userIdentity,
      template_id: params.template.id,
      template_name: params.template.name,
      channel: params.template.channel,
      title: params.title,
      body: params.body,
      status: params.status,
      metadata: params.template.metadata,
      expiry: expiryDate,
      campaign_id: params.campaignId,
    });
  }

  async sendPushNotification(request: PnRequestDto) {
    const template = await this.getTemplate(
      request.templateId,
      request.templateName,
    );
    const userIdentity = await this.getUserIdentity(
      request.userId,
      template.channel,
    );
    const onesignalRequest = this.createOnesignalRequest(
      request.userId,
      template,
      request.fillers,
    );
    const status = await this.clientService.sendOnesignalPn(onesignalRequest);
    await this.logNotification({
      userId: request.userId,
      userIdentity,
      template,
      title: onesignalRequest.headings.en,
      body: onesignalRequest.contents.en,
      status:
        status === 200 ? NotificationStatus.SENT : NotificationStatus.FAILED,
      campaignId: request.campaignId,
    });
    if (status !== 200) {
      throw new HttpException(
        { message: 'Something went wrong while sending push notification.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      success: true,
      message: 'Push notification sent successfully',
    };
  }

  async sendSilentPN(requests: PnRequestDto[]) {
    const silentPNDefaultExpiryHours =
      await this.notificationParamService.getNumberParamValue(
        'SILENT_PN_DEFAULT_EXPIRY_HOURS',
        15,
      );
    const notificationLogs = await Promise.all(
      requests.map(async (request) => {
        const template = await this.getTemplate(
          request.templateId,
          request.templateName,
        );
        const userIdentity = await this.getUserIdentity(
          request.userId,
          template.channel,
        );
        const title = this.commonService.replaceFillers(
          template.title,
          request.fillers,
        );
        const body = this.commonService.replaceFillers(
          template.body,
          request.fillers,
        );
        let expiryDate = this.commonService.calculateDateForValidity(
          template.metadata.valid_days,
          template.metadata.valid_hours,
        );
        const currentDate = new Date();
        if (expiryDate <= currentDate) {
          expiryDate = new Date(
            currentDate.getTime() + silentPNDefaultExpiryHours * 60 * 60 * 1000,
          );
        }
        return {
          user_id: request.userId,
          user_identity: userIdentity,
          template_id: template.id,
          template_name: template.name,
          channel: template.channel,
          title,
          body,
          status: NotificationStatus.SENT,
          metadata: template.metadata,
          expiry: expiryDate,
          campaign_id: request.campaignId,
        };
      }),
    );
    await this.logRepository.save(notificationLogs);
  }

  buildPnResponseDto(log: LogEntity) {
    const response = new PnResponseDto();
    response.created_at = log.created_at.toISOString();
    response.updated_at = log.updated_at.toISOString();
    response.id = log.id;
    response.user_id = log.user_id;
    response.user_identity = log.user_identity;
    response.template_name = log.template_name;
    response.channel = log.channel;
    response.title = log.title;
    response.body = log.body;
    response.status = log.status;
    response.template_id = log.template_id;
    if (log.metadata == null) {
      response.metadata = {};
    } else {
      response.metadata = log.metadata;
    }
    return response;
  }

  async validateNotificationSheetUpload(pnUploadBeans: UploadBean[]) {
    const pnParseResults = new ParseResult<UploadBean>();

    const names = new Set(pnUploadBeans.map((bean) => bean.templateName));
    const existingTemplateMap: Map<string, TemplateEntity> =
      await this.getExistingTemplateMap([...names]);

    const userIds = new Set(pnUploadBeans.map((bean) => bean.userId));
    const existingUsersMap = await this.commonService.getAllUsers([...userIds]);

    const templateEntityKeys: Map<string, string[]> = new Map();

    existingTemplateMap.forEach((temp) => {
      const keys: string[] = this.commonService.extractKeysFromTemplates([
        temp.title,
        temp.body,
      ]);
      templateEntityKeys.set(temp.name, keys);
    });

    for (const pnRawBean of pnUploadBeans) {
      if (pnRawBean.userId == null) {
        pnRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Id is mandatory', 'userId'),
        );
      } else if (pnRawBean.templateName == null) {
        pnRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'Template Name is mandatory',
            'templateName',
          ),
        );
      } else if (!existingUsersMap.has(pnRawBean.userId)) {
        pnRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Not Found', 'userId'),
        );
      } else if (!existingTemplateMap.has(pnRawBean.templateName)) {
        pnRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'Template not found', 'templateName'),
        );
      } else {
        const keyValues = this.commonService.createKeyValuePair(
          pnRawBean.fillers ? `${pnRawBean.fillers}` : '',
        );

        const fillers: {
          fillers: Map<string, string>;
          missingFields: string[];
        } = this.commonService.checkFillerKeys(
          templateEntityKeys.get(pnRawBean.templateName),
          JSON.parse(keyValues),
        );

        if (fillers.missingFields.length) {
          pnRawBean.errors.push(
            new ErrorBean(
              'FIELD_ERROR',
              `Filler keys missing: ${fillers.missingFields}`,
              `${fillers.missingFields}`,
            ),
          );
        }

        pnRawBean.userId = pnRawBean.userId.toString();
        pnRawBean.templateName = pnRawBean.templateName;
        pnRawBean.fillers = fillers.fillers;
      }
      if (pnRawBean.errors.length == 0) {
        pnParseResults.successRows.push(pnRawBean);
      } else {
        pnParseResults.failedRows.push(pnRawBean);
      }
    }
    return pnParseResults;
  }

  async getExistingTemplateMap(name: string[]) {
    const template = await this.templateService.getTemplatesByNameList(
      name,
      NotificationChannel.PN,
    );
    return new Map(
      template.map((temp) => {
        return [temp.name, temp];
      }),
    );
  }

  async getPushNotifications(userId: string) {
    const userIdentity = (
      await this.commonService.getUserIdentity(userId, NotificationChannel.PN)
    ).identity;

    const whereClause: FindOptionsWhere<LogEntity> = {
      channel: NotificationChannel.PN,
      user_identity: userIdentity,
      status: NotificationStatus.SENT,
      expiry: MoreThanOrEqual(new Date()),
    };
    try {
      const logs = await this.logRepository.find({
        where: whereClause,
        order: { created_at: 'DESC' },
      });
      return logs.map((log) => {
        return this.buildPnResponseDto(log);
      });
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching push notifications',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while fetching push notifications' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
