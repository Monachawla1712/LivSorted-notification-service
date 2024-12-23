import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Between,
  FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LogEntity } from '../notification/log.entity';
import { TemplateService } from '../template/template.service';
import { CommonService } from '../core/common/common.service';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { ClientService } from '../core/client/client.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { NotificationParamsService } from '../notification-params/notification-params.service';
import { NotificationStatus } from '../core/enums/notification.status';
import { NotificationChannel } from '../core/enums/notification.channel';
import { InAppResponseDto } from './dto/in-app.response.dto';
import { ParseResult } from 'src/core/common/dto/parse-result';
import { ErrorBean } from 'src/core/common/dto/error-bean';
import { UserEntity } from 'src/notification/user.entity';
import { TemplateEntity } from 'src/template/template.entity';
import { InAppRequestDto } from './dto/in-app.request.dto';
import { UploadBean } from '../core/common/sheet-upload/upload.bean';

@Injectable()
export class InAppService {
  private readonly logger = new CustomLogger(InAppService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private templateService: TemplateService,
    private commonService: CommonService,
    private notificationParamService: NotificationParamsService,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async markAsRead(id: string) {
    try {
      const log = await this.logRepository.findOneBy({ id: id });
      if (log) {
        log.status = NotificationStatus.READ;
        await this.logRepository.save(log);
      }
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        `Error while marking in-app notification as read`,
        e,
      );
      throw new HttpException(
        {
          message:
            'Something went wrong while marking in-app notification as read',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  buildInAppResponse(log: LogEntity) {
    const response = new InAppResponseDto();
    response.created_at = log.created_at.toString();
    response.updated_at = log.updated_at.toString();
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
    if (log.expiry != null) {
      response.expiry = log.expiry.toString();
    }
    return response;
  }
  async getInAppNotification(userId: string) {
    const whereClause: FindOptionsWhere<LogEntity> = {
      channel: NotificationChannel.IN_APP,
      user_id: userId,
      status: NotificationStatus.SENT,
      expiry: MoreThanOrEqual(new Date()),
    };
    const orderBy = 'ASC';
    let log;
    try {
      log = await this.logRepository.findOne({
        where: whereClause,
        order: { created_at: orderBy },
      });
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        `Error while getting in-app notification`,
        e,
      );
      throw e;
    }

    if (!log) {
      throw new HttpException(
        { message: 'No in-app notification found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.buildInAppResponse(log);
  }

  async sendInAppNotifications(requests: InAppRequestDto[]) {
    let failedCount = 0;
    let successCount = 0;
    let userIds = [];
    const failedRequests = [];
    for (const request of requests) {
      try {
        await this.sendInAppNotification(request);
        successCount++;
        userIds.push(request.userId);
      } catch (e) {
        this.logger.error(
          this.asyncContext.get('traceId'),
          `Error while sending in-app notification request ${request}`,
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

  async sendInAppNotification(request: InAppRequestDto) {
    const template = request.templateId
      ? await this.templateService.getTemplateById(request.templateId)
      : await this.templateService.getTemplateByName(request.templateName);

    if (template.channel != NotificationChannel.IN_APP) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const userIdentity = (
      await this.commonService.getUserIdentity(request.userId, template.channel)
    ).identity;

    const headings = {
      en: this.commonService.replaceFillers(template.title, request.fillers),
    };
    const contents = {
      en: this.commonService.replaceFillers(template.body, request.fillers),
    };

    request.validHours =
      request.validHours ?? template.metadata?.valid_hours ?? 0;

    request.validDays =
      request.validDays ??
      template.metadata?.valid_days ??
      (await this.notificationParamService.getNumberParamValue(
        'IN_APP_DEFAULT_VALID_DAYS',
        1,
      ));

    const expiryDate: Date = this.commonService.calculateDateForValidity(
      request.validDays,
      request.validHours,
    );

    await this.logRepository.save({
      user_id: request.userId,
      user_identity: userIdentity,
      template_id: template.id,
      template_name: template.name,
      channel: template.channel,
      title: headings.en,
      body: contents.en,
      status: NotificationStatus.SENT,
      metadata: template.metadata,
      expiry: expiryDate,
      campaign_id: request.campaignId,
    });

    return {
      success: true,
      message: 'in-app notification sent successfully',
    };
  }

  async validateNotificationSheetUpload(inAppUploadBeans: UploadBean[]) {
    const inAppParseResults = new ParseResult<UploadBean>();

    const names = new Set(inAppUploadBeans.map((bean) => bean.templateName));
    const existingTemplateMap: Map<string, TemplateEntity> =
      await this.getExistingTemplateMap([...names]);

    const userIds = new Set(inAppUploadBeans.map((bean) => bean.userId));
    const existingUsersMap: Map<string, UserEntity> =
      await this.commonService.getAllUsers([...userIds]);

    const templateEntityKeys: Map<string, string[]> = new Map();

    existingTemplateMap.forEach((temp) => {
      const keys: string[] = this.commonService.extractKeysFromTemplates([
        temp.title,
        temp.body,
      ]);
      templateEntityKeys.set(temp.name, keys);
    });

    for (const inAppRawBean of inAppUploadBeans) {
      if (inAppRawBean.userId == null) {
        inAppRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Id is mandatory', 'userId'),
        );
      } else if (inAppRawBean.templateName == null) {
        inAppRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'Template Name is mandatory',
            'templateName',
          ),
        );
      } else if (!existingUsersMap.has(inAppRawBean.userId)) {
        inAppRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Not Found', 'userId'),
        );
      } else if (!existingTemplateMap.has(inAppRawBean.templateName)) {
        inAppRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'Template not found', 'templateName'),
        );
      } else {
        const keyValues = this.commonService.createKeyValuePair(
          inAppRawBean.fillers ? `${inAppRawBean.fillers}` : '',
        );

        const fillers: {
          fillers: Map<string, string>;
          missingFields: string[];
        } = this.commonService.checkFillerKeys(
          templateEntityKeys.get(inAppRawBean.templateName),
          JSON.parse(keyValues),
        );

        if (fillers.missingFields.length) {
          inAppRawBean.errors.push(
            new ErrorBean(
              'FIELD_ERROR',
              `Filler keys missing: ${fillers.missingFields}`,
              `${fillers.missingFields}`,
            ),
          );
        }

        inAppRawBean.userId = inAppRawBean.userId.toString();
        inAppRawBean.templateName = inAppRawBean.templateName;
        inAppRawBean.fillers = fillers.fillers;
      }
      if (inAppRawBean.errors.length == 0) {
        inAppParseResults.successRows.push(inAppRawBean);
      } else {
        inAppParseResults.failedRows.push(inAppRawBean);
      }
    }
    return inAppParseResults;
  }

  async getExistingTemplateMap(name: string[]) {
    const template = await this.templateService.getTemplatesByNameList(
      name,
      NotificationChannel.IN_APP,
    );
    return new Map(
      template.map((temp) => {
        return [temp.name, temp];
      }),
    );
  }

  async stopInAppNotifications(request: {
    date: Date;
    templateName: string;
    time: string;
  }) {
    const template = await this.templateService.getTemplateByName(
      request.templateName,
    );

    if (template.channel != NotificationChannel.IN_APP) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const startDate = new Date(`${request.date}T${request.time}:00`);
    const startDateUTC = new Date(startDate.getTime() - (5 * 60 + 30) * 60000);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 10);
    const endDateUTC = new Date(endDate.getTime() - (5 * 60 + 30) * 60000);

    await this.logRepository.update(
      {
        template_name: request.templateName,
        created_at: Between(startDateUTC, endDateUTC),
      },
      {
        expiry: new Date(),
      },
    );
  }
}
