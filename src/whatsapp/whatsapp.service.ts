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
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { WhatsappOptInRequestDto } from './dto/whatsapp_opt_in_request.dto';
import axios from 'axios';
import { WhatsappMessageRequestDto } from './dto/whatsappMessage.request.dto';
import { NotificationChannel } from '../core/enums/notification.channel';
import { NotificationStatus } from '../core/enums/notification.status';
import {
  GupshupWhatsappMessage,
  GupshupWhatsappRequestParamsDto,
} from './dto/gupshup.whatsapp.request.params.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new CustomLogger(WhatsappService.name);

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
  async setGupshupWhatsappOptIn(request: WhatsappOptInRequestDto) {
    try {
      const gupshupUrl =
        this.configService.get<string>('gupshup_io_url') +
        '/sm/api/v1/app/opt/' +
        (request.whatsappOptIn == true ? 'in' : 'out') +
        '/' +
        this.configService.get<string>('gupshup_app_name');
      const axiosOptions = {
        url: gupshupUrl,
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          apiKey: this.configService.get<string>('gupshup_app_auth'),
        },
        data: {
          user: '91' + request.userPhone,
        },
      };
      const result = await axios(axiosOptions);
      return result.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while setting whatsapp opt in at Gupshup for request: ' +
          JSON.stringify(request),
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while setting whatsapp opt in' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendMultipleWhatsappMessages(requests: WhatsappMessageRequestDto[]) {
    let failedCount = 0;
    let successCount = 0;
    const successUsers = [];
    const failedRequests = [];
    for (const request of requests) {
      try {
        if (request.userId == null && request.phoneNumber == null) {
          console.error(`userId or phone number must be present`);
          failedCount++;
          continue;
        }
        await this.sendSingleGupshupWhatsappMessage(request);
        successCount++;
        successUsers.push(request.userId);
      } catch (e) {
        console.error(`Error while sending Whatsapp Message ${request}`, e);
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

  async sendSingleGupshupWhatsappMessage(request: WhatsappMessageRequestDto) {
    const template = request.templateId
      ? await this.templateService.getTemplateById(request.templateId)
      : await this.templateService.getTemplateByName(request.templateName);
    if (template.channel != NotificationChannel.WHATSAPP) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
    request.messageType = template.metadata.messageType;
    let phoneNumber: string;
    if (request.phoneNumber) {
      phoneNumber = request.phoneNumber;
    } else {
      const userIdentity = await this.commonService.getUserIdentity(
        request.userId,
        template.channel,
      );
      phoneNumber = userIdentity.identity;
    }

    let responseStatus = null;
    const gupshupWhatsappRequestParamsDto =
      new GupshupWhatsappRequestParamsDto();
    if (request.messageType == 'text') {
      gupshupWhatsappRequestParamsDto.send_to = '91' + phoneNumber;
      gupshupWhatsappRequestParamsDto.message = new GupshupWhatsappMessage();
      gupshupWhatsappRequestParamsDto.message.type = 'text';
      gupshupWhatsappRequestParamsDto.message.text =
        this.commonService.replaceFillers(template.body, request.fillers);
    } else if (request.messageType == 'video') {
      gupshupWhatsappRequestParamsDto.send_to = '91' + phoneNumber;
      gupshupWhatsappRequestParamsDto.message = new GupshupWhatsappMessage();
      gupshupWhatsappRequestParamsDto.message.type = 'video';
      gupshupWhatsappRequestParamsDto.message.video = { id: request.videoId };
      gupshupWhatsappRequestParamsDto.template = {
        id: request.videoTemplateId,
        params: request.videoParams,
      };
    } else if (request.messageType == 'image') {
      gupshupWhatsappRequestParamsDto.send_to = '91' + phoneNumber;
      gupshupWhatsappRequestParamsDto.message = new GupshupWhatsappMessage();
      gupshupWhatsappRequestParamsDto.message.type = 'image';
      gupshupWhatsappRequestParamsDto.message.image = { link: request.url };
      gupshupWhatsappRequestParamsDto.template = {
        id: template.title,
        params: request.params,
      };
    } else if (request.messageType == 'doc') {
      gupshupWhatsappRequestParamsDto.send_to = '91' + phoneNumber;
      gupshupWhatsappRequestParamsDto.message = new GupshupWhatsappMessage();
      gupshupWhatsappRequestParamsDto.message.type = 'document';
      // gupshupWhatsappRequestParamsDto.message.url = request.url;
      gupshupWhatsappRequestParamsDto.template = {
        id: template.title,
        params: request.params,
      };
      gupshupWhatsappRequestParamsDto.message.document = {
        link: request.url,
        filename: 'file.pdf',
      };
      gupshupWhatsappRequestParamsDto.message.caption =
        this.commonService.replaceFillers(template.body, request.fillers);
      gupshupWhatsappRequestParamsDto.message.filename = request.fileName
        ? request.fileName
        : 'file';
    } else {
      throw new HttpException(
        { message: 'Message type not supported' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (template.entity_type == 'Sorted') {
      responseStatus = await this.clientService.sendWhatsappMessageGupshup(
        gupshupWhatsappRequestParamsDto,
      );
    } else {
      responseStatus =
        await this.clientService.sendHandpickedWhatsappMessageGupshup(
          gupshupWhatsappRequestParamsDto,
        );
    }
    await this.logRepository.save({
      user_id: request.userId,
      user_identity: phoneNumber,
      template_id: template.id,
      template_name: template.name,
      channel: template.channel,
      title: template.title,
      body: gupshupWhatsappRequestParamsDto.msg,
      campaign_id: request.campaignId,
      status:
        responseStatus == 200 || responseStatus == 202
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
    });
    if (responseStatus != 200 && responseStatus != 202) {
      throw new HttpException(
        { message: 'Something went wrong while sending Whatsapp Message.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      success: true,
      message: 'Whatsapp message sent successfully',
    };
  }
}
