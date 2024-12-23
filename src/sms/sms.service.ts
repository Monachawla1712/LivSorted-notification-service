import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LogEntity } from '../notification/log.entity';
import { TemplateService } from '../template/template.service';
import { CommonService } from '../core/common/common.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { ClientService } from '../core/client/client.service';
import { SmsRequestDto } from './dto/sms.request.dto';
import { NotificationChannel } from '../core/enums/notification.channel';
import { NotificationStatus } from '../core/enums/notification.status';
import { GupshupSmsRequestParamsDto } from './dto/gupshup.sms.request.params.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { TemplateType } from 'src/template/template-constants';

@Injectable()
export class SmsService {
  private readonly logger = new CustomLogger(SmsService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private templateService: TemplateService,
    private commonService: CommonService,
    private clientService: ClientService,
    private httpService: HttpService,
    private configService: ConfigService<Config, true>,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async sendMultipleGupshupSms(requests: SmsRequestDto[]) {
    let failedCount = 0;
    let successCount = 0;
    const failedRequests = [];
    const successUsers = [];
    for (const request of requests) {
      try {
        await this.sendSingleGupshupSms(request);
        successCount++;
        successUsers.push(request.userId);
      } catch (e) {
        this.logger.error(
          this.asyncContext.get('traceId'),
          `Error while sending SMS ${request}`,
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
        userIds: successUsers,
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

  async sendSingleGupshupSms(request: SmsRequestDto) {
    const template = request.templateId
      ? await this.templateService.getTemplateById(request.templateId)
      : await this.templateService.getTemplateByName(request.templateName);

    if (template.channel != NotificationChannel.SMS) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const userIdentity = (
      await this.commonService.getUserIdentity(request.userId, template.channel)
    ).identity;
    const gupshupSmsParams = new GupshupSmsRequestParamsDto();
    gupshupSmsParams.send_to = '91' + userIdentity;
    gupshupSmsParams.msg = this.commonService.replaceFillers(
      template.body,
      request.fillers,
    );
    const templateType = template?.metadata?.type;
    let isPromotional = false;
    if(templateType && templateType === TemplateType.PROMOTIONAL) {
      isPromotional = true;
      gupshupSmsParams.msg_type = "Text";
    }
    gupshupSmsParams.userid = this.configService.get<string>(isPromotional ? 'gupshup_promo_userid': 'gupshup_userid');
    gupshupSmsParams.password = this.configService.get<string>(isPromotional ? 'gupshup_promo_pwd' : 'gupshup_pwd');
    const status = await this.clientService.sendSmsGupshup(gupshupSmsParams);
    await this.logRepository.save({
      user_id: request.userId,
      user_identity: userIdentity,
      template_id: template.id,
      template_name: template.name,
      channel: template.channel,
      title: template.title,
      body: gupshupSmsParams.msg,
      campaign_id: request.campaignId,
      status:
        status == 200 ? NotificationStatus.SENT : NotificationStatus.FAILED,
    });
    if (status != 200) {
      throw new HttpException(
        { message: 'Something went wrong while sending SMS.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      success: true,
      message: 'sms sent successfully',
    };
  }
}
