import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Repository } from 'typeorm';
import { AsyncContext } from '@nestjs-steroids/async-context';

import { CustomLogger } from '../core/custom-logger';
import { CommonService } from '../core/common/common.service';
import { InAppService } from '../in-app/in-app.service';
import { LogEntity } from '../notification/log.entity';
import { CampaignEntity } from './campaign.entity';
import { NotificationChannel } from '../core/enums/notification.channel';
import {
  CampaignStatus,
  CampaignUpdateStatus,
} from '../core/enums/campaign.status';
import { CreateCampaignDto } from './dto/create.campaign.dto';
import { UpdateCampaignDto } from './dto/update.campaign';
import { InAppRequestDto } from '../in-app/dto/in-app.request.dto';
import { PnRequestDto } from '../pn/dto/pn.request.dto';
import { PnService } from '../pn/pn.service';
import { NotificationSendChannel } from '../core/enums/notification.send.channel';
import { NotificationParamsService } from '../notification-params/notification-params.service';
import { ClevertapNotificationRequestDto } from '../clevertap/dto/clevertap-notification-request.dto';
import { ClevertapService } from '../clevertap/clevertap.service';
import { SmsService } from '../sms/sms.service';
import { SmsRequestDto } from '../sms/dto/sms.request.dto';
import { Config } from '../config/configuration';
import { ConfigService } from '@nestjs/config';
import { AwsGenericLambdaDto } from '../core/common/dto/aws.generic.lambda.dto';
import { UploadBean } from '../core/common/sheet-upload/upload.bean';
import { NotificationQueueEntity } from './notification.queue.entity';
import { NotificationQueueService } from './notification.queue.service';
import { AwsService } from '../core/common/aws.service';
import { Readable } from 'stream';
import { AWSConstants, Endpoints } from '../core/common/constants';
import { WhatsappMessageRequestDto } from '../whatsapp/dto/whatsappMessage.request.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class CampaignService {
  private readonly logger = new CustomLogger(CampaignService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>,
    private readonly commonService: CommonService,
    private readonly inAppService: InAppService,
    private readonly pnService: PnService,
    private readonly clevertapService: ClevertapService,
    private readonly notificationParamService: NotificationParamsService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
    private readonly notificationQueueService: NotificationQueueService,
    private configService: ConfigService<Config, true>,
    private awsService: AwsService,
  ) {}

  async createCampaign(dto: CreateCampaignDto, file: any, userId: string) {
    const whereCondition: any = {
      name: dto.name,
      notification_channel: dto.notification_channel,
      status: In([
        CampaignStatus.DRAFT,
        CampaignStatus.SCHEDULED,
        CampaignStatus.IN_PROGRESS,
      ]),
    };
    if (dto.schedule_time) {
      whereCondition.schedule_time = new Date(dto.schedule_time);
    }
    const existingCampaign = await this.campaignRepository.findOne({
      where: whereCondition,
    });
    if (existingCampaign) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        `Campaign already exists for the given details: ${dto}`,
      );
      throw this.commonService.createHttpException(
        'Campaign already exists',
        HttpStatus.BAD_REQUEST,
      );
    }
    const notificationUploadBean = await this.validateCsvFile(file);
    if (notificationUploadBean.failedRows.length > 0) {
      return { campaign: null, notificationUploadBean };
    }
    const url = await this.uploadFileToS3(file);
    await this.validateScheduleTime(dto.schedule_time);
    const campaign = await this.saveCampaign(dto, userId, url);
    await this.processCampaignBasedOnStatus(campaign);
    return campaign;
  }

  private async validateScheduleTime(scheduleTime: string | Date) {
    const campaignPublishBuffer =
      await this.notificationParamService.getNumberParamValue(
        'CAMPAIGN_PUBLISH_BUFFER_MINUTES',
        15,
      );
    const scheduleDate = new Date(scheduleTime);
    const currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() + campaignPublishBuffer);
    if (scheduleDate <= currentTime) {
      throw this.commonService.createHttpException(
        `Schedule time should be at least ${campaignPublishBuffer} minutes from now`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    file: any,
    userId: string,
  ) {
    let campaign = await this.findCampaignForUpdate(id);
    campaign = await this.updateCampaignFields(dto, campaign);
    if (campaign.status == CampaignStatus.DRAFT && file) {
      const fillers = this.parseFillerData(dto, campaign);
      const notificationUploadBean = await this.validateCsvFile(file);
      if (notificationUploadBean.failedRows.length > 0) {
        return { campaign: null, notificationUploadBean };
      }
      const url = await this.uploadFileToS3(file);
      campaign.status = this.determineCampaignUpdateStatus(dto);
      campaign.meta_data.sheet_url = url;
      campaign.meta_data.fillers = fillers;
      campaign.updated_by = userId;
      await this.processCampaignBasedOnStatus(campaign);
      await this.campaignRepository.save(campaign);
    }

    campaign.updated_by = userId;
    return this.handleCampaignUpdateStatus(campaign, dto);
  }

  private async validateCsvFile(file: any) {
    try {
      return await this.commonService.parseAndValidateSheet(file);
    } catch (error) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'CSV file validation failed',
        error,
      );
      throw this.commonService.createHttpException(
        'CSV file validation failed',
      );
    }
  }

  private async uploadFileToS3(file: any) {
    try {
      return await this.awsService.uploadFile(
        file,
        AWSConstants.CAMPAIGN_FOLDER,
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Failed to upload file to S3',
        e,
      );
      throw this.commonService.createHttpException(
        'Failed to upload file to S3',
      );
    }
  }

  private parseFillerData(dto: UpdateCampaignDto, campaign: CampaignEntity) {
    if (dto.fillers) {
      return JSON.parse(dto.fillers);
    } else {
      return campaign.meta_data.fillers ? campaign.meta_data.fillers : {};
    }
  }

  private determineCampaignUpdateStatus(dto: UpdateCampaignDto) {
    if (dto.status == CampaignUpdateStatus.POSTPONE) {
      return CampaignStatus.SCHEDULED;
    } else if (dto.status == CampaignUpdateStatus.SEND_NOW) {
      return CampaignStatus.IN_PROGRESS;
    }
  }

  private async processCampaignBasedOnStatus(campaign: CampaignEntity) {
    if (this.isEligibleForProcessing(campaign)) {
      await this.pushProcessRequestToSqs(campaign.id, false);
    } else if (this.isSendNow(campaign)) {
      await this.pushProcessRequestToSqs(campaign.id, true);
    }
  }

  isSendNow(campaign: CampaignEntity) {
    return campaign.status == CampaignStatus.IN_PROGRESS;
  }

  isEligibleForProcessing(campaign: CampaignEntity) {
    return (
      campaign.status == CampaignStatus.SCHEDULED &&
      new Date(campaign.schedule_time).getTime() < Date.now() + 30 * 60 * 1000
    );
  }

  private async handleCampaignUpdateStatus(
    campaign: CampaignEntity,
    dto: UpdateCampaignDto,
  ) {
    switch (dto.status) {
      case CampaignUpdateStatus.POSTPONE:
        return await this.postponeCampaign(campaign, dto.schedule_time);
      case CampaignUpdateStatus.STOP:
        return await this.stopCampaign(campaign);
      case CampaignUpdateStatus.SEND_NOW:
        campaign.status = CampaignStatus.IN_PROGRESS;
        await this.campaignRepository.save(campaign);
        // await this.processCampaignSheetData(campaign, true);
        return await this.pushProcessRequestToSqs(campaign.id, true);
      case CampaignUpdateStatus.DRAFT:
        return await this.campaignRepository.save(campaign);
      default:
        throw this.commonService.createHttpException(
          'Invalid campaign update status',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  async getPaginatedCampaigns(
    page: number,
    limit: number,
    search?: string,
    type?: NotificationChannel,
    status?: CampaignStatus,
  ) {
    const filter = this.buildCampaignFilter(search, type, status);
    limit = Math.min(limit, 200);
    const [campaigns, total] = await this.campaignRepository.findAndCount({
      where: {
        ...filter,
        is_active: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data: campaigns,
      pageNo: Number(page),
      pageSize: Number(limit),
      total: Number(total),
      pages: Math.ceil(total / limit),
    };
  }

  private async stopNotifications(campaign: CampaignEntity): Promise<void> {
    switch (campaign.notification_channel) {
      case NotificationChannel.IN_APP:
        await this.stopInAppCampaignLogs(campaign.id);
        break;
      default:
        throw new Error('Unsupported notification channel');
    }
  }

  private async handleSendNotificationsByChannel(
    campaign: CampaignEntity,
  ): Promise<boolean> {
    if (campaign.notification_channel === NotificationChannel.IN_APP) {
      return await this.sendInAppNotifications(campaign);
    } else if (campaign.notification_channel === NotificationChannel.PN) {
      return await this.sendPushNotifications(campaign);
    } else if (campaign.notification_channel === NotificationChannel.SMS) {
      return await this.sendSMS(campaign);
    } else if (campaign.notification_channel === NotificationChannel.WHATSAPP) {
      return await this.sendWhatsappMessages(campaign);
    }
    return false;
  }

  private async stopInAppCampaignLogs(campaignId: string): Promise<void> {
    const batchSize = 500;
    let offset = 0;
    while (true) {
      const logs = await this.logRepository.find({
        where: { campaign_id: campaignId },
        take: batchSize,
        skip: offset,
      });
      if (logs.length == 0) {
        break;
      }
      for (const log of logs) {
        log.expiry = new Date();
      }
      try {
        await this.logRepository.save(logs);
      } catch (error) {
        throw this.commonService.createHttpException(
          'Failed to stop inApp campaign',
        );
      }
      offset += batchSize;
    }
  }

  private async saveCampaign(
    dto: CreateCampaignDto,
    userId: string,
    url: string,
  ): Promise<CampaignEntity> {
    try {
      const campaign = CampaignEntity.createCampaignEntity(dto, userId, url);
      return await this.campaignRepository.save(campaign);
    } catch (error) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Campaign creation failed',
        error,
      );
      throw this.commonService.createHttpException('Campaign creation failed');
    }
  }

  private async findCampaignForUpdate(id: string): Promise<CampaignEntity> {
    const campaign = await this.campaignRepository.findOne({
      where: {
        id,
        status: In([CampaignStatus.SCHEDULED, CampaignStatus.DRAFT]),
        is_active: true,
      },
    });
    if (!campaign) {
      throw this.commonService.createHttpException(
        'Campaign not found',
        HttpStatus.BAD_REQUEST,
      );
    }
    return campaign;
  }

  private buildCampaignFilter(
    search?: string,
    type?: NotificationChannel | NotificationChannel[],
    status?: CampaignStatus | CampaignStatus[],
  ) {
    const filter: any = {};
    if (search) {
      filter.name = ILike(`%${search}%`);
    }
    if (type) {
      filter.notification_channel = Array.isArray(type) ? In(type) : type;
    }
    if (status) {
      filter.status = Array.isArray(status) ? In(status) : status;
    }
    return filter;
  }

  private async postponeCampaign(
    campaign: CampaignEntity,
    scheduleTime?: string,
  ): Promise<CampaignEntity> {
    if (scheduleTime) {
      campaign.schedule_time = new Date(scheduleTime);
    }
    campaign.status = CampaignStatus.SCHEDULED;
    return this.campaignRepository.save(campaign);
  }

  private async stopCampaign(
    campaign: CampaignEntity,
  ): Promise<CampaignEntity> {
    if (campaign.status == CampaignStatus.DRAFT) {
      campaign.is_active = false;
    } else {
      if (campaign.notification_channel == NotificationChannel.IN_APP) {
        await this.stopNotifications(campaign);
      }
      campaign.status = CampaignStatus.STOPPED;
    }
    return await this.campaignRepository.save(campaign);
  }

  private async publishCampaign(campaign: CampaignEntity): Promise<HttpStatus> {
    const statusResponse = HttpStatus.CREATED;
    this.handleSendNotificationsByChannel(campaign)
      .then(async (res) => {
        campaign.status = res
          ? CampaignStatus.PUBLISHED
          : CampaignStatus.FAILED;
        await this.campaignRepository.save(campaign);
      })
      .catch(async (error) => {
        campaign.status = CampaignStatus.FAILED;
        await this.campaignRepository.save(campaign);
        console.error('Error updating campaign status:', error);
      });
    return statusResponse;
  }

  private async sendNotifications(
    campaign: CampaignEntity,
    channelType: NotificationChannel,
  ): Promise<boolean> {
    const batchSize = await this.notificationParamService.getNumberParamValue(
      'NOTIFICATION_BATCH_SIZE',
      500,
    );
    const processedUsers = new Set<string>();
    while (true) {
      const queueBatch =
        await this.notificationQueueService.findByCampaignIdAndProcessed(
          campaign.id,
          false,
          batchSize,
        );
      if (queueBatch.length === 0) {
        break;
      }
      const filteredBatch = queueBatch.filter(
        (entry) => !processedUsers.has(entry.user_id),
      );
      if (filteredBatch.length === 0) {
        continue;
      }
      const queueDataMap = new Map(
        filteredBatch.map((entry) => [entry.user_id, entry]),
      );
      const request = filteredBatch.map((entry) =>
        this.buildNotificationRequest(entry, campaign),
      );
      const res = await this.dispatchNotifications(
        channelType,
        campaign,
        request,
      );
      if (res.success) {
        await this.markQueuesAsProcessed(res.userIds, queueDataMap);
        res.userIds.forEach((userId: string) => processedUsers.add(userId));
      } else {
        this.logger.log(
          this.asyncContext.get('traceId'),
          `Error publishing campaign for users: ${res.userIds}`,
        );
        await this.notificationQueueService.markInactive(res.userIds);
      }
    }
    return true;
  }

  private buildNotificationRequest(queueEntry: any, campaign: CampaignEntity) {
    const { userId, templateName, fillers, phoneNumber } = queueEntry.meta_data;
    return {
      userId,
      templateName,
      fillers: new Map(Object.entries(fillers)),
      phoneNumber,
      templateId: campaign.template_id,
      campaignId: campaign.id,
    };
  }

  private async dispatchNotifications(
    channelType: NotificationChannel,
    campaign: CampaignEntity,
    request: any[],
  ): Promise<any> {
    switch (channelType) {
      case NotificationChannel.PN:
        const channel = await this.getNotificationSendChannel(campaign);
        return await this.sendPNByChannel(
          channel,
          request,
          campaign.meta_data.is_silent_pn,
        );
      case NotificationChannel.SMS:
        return await this.smsService.sendMultipleGupshupSms(
          request as SmsRequestDto[],
        );
      case NotificationChannel.IN_APP:
        return await this.inAppService.sendInAppNotifications(
          request as InAppRequestDto[],
        );
      case NotificationChannel.WHATSAPP:
        return await this.whatsappService.sendMultipleWhatsappMessages(
          request as WhatsappMessageRequestDto[],
        );
      default:
        throw new Error('Invalid channel type');
    }
  }

  private async markQueuesAsProcessed(
    userIds: string[],
    queueDataMap: Map<string, any>,
  ) {
    const idsToUpdate = userIds
      .map((userId) => queueDataMap.get(userId)?.id)
      .filter(Boolean);
    if (idsToUpdate.length > 0) {
      await this.notificationQueueService.markQueuesAsProcessed(idsToUpdate);
    }
  }

  private async sendPNByChannel(
    channel: string,
    data: any[],
    isSilentPN: boolean,
  ) {
    if (isSilentPN && isSilentPN == true) {
      return await this.pnService.sendSilentPN(data as PnRequestDto[]);
    } else {
      if (channel === NotificationSendChannel.Clevertap) {
        return await this.clevertapService.sendClevertapNotifications(
          data as ClevertapNotificationRequestDto[],
        );
      } else if (channel === NotificationSendChannel.Onesignal) {
        return await this.pnService.sendPushNotifications(
          data as PnRequestDto[],
        );
      }
    }
  }

  private async getNotificationSendChannel(
    campaign: CampaignEntity,
  ): Promise<string> {
    return (
      campaign.meta_data.pn_channel ||
      this.notificationParamService.getStringParamValue(
        'SEND_NOTIFICATION_CHANNEL',
        NotificationSendChannel.Clevertap,
      )
    );
  }

  async sendPushNotifications(campaign: CampaignEntity): Promise<boolean> {
    return await this.sendNotifications(campaign, NotificationChannel.PN);
  }

  async sendSMS(campaign: CampaignEntity): Promise<boolean> {
    return await this.sendNotifications(campaign, NotificationChannel.SMS);
  }

  async sendInAppNotifications(campaign: CampaignEntity): Promise<boolean> {
    return await this.sendNotifications(campaign, NotificationChannel.IN_APP);
  }

  async sendWhatsappMessages(campaign: CampaignEntity) {
    return await this.sendNotifications(campaign, NotificationChannel.WHATSAPP);
  }

  async publishScheduledCampaign(id: string) {
    const campaign = await this.campaignRepository.findOne({
      where: {
        id,
        status: CampaignStatus.IN_PROGRESS,
        is_active: true,
        is_data_processed: true,
      },
    });
    if (!campaign) {
      throw this.commonService.createHttpException(
        'Campaign not found',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.publishCampaign(campaign);
  }

  async sendCampaignToSqs() {
    const campaignPublishBuffer =
      await this.notificationParamService.getNumberParamValue(
        'CAMPAIGN_PUBLISH_BUFFER_MINUTES',
        15,
      );
    const timeBuffer = new Date().getTime() + campaignPublishBuffer * 60 * 1000;
    const campaigns = await this.campaignRepository.find({
      where: {
        status: CampaignStatus.SCHEDULED,
        schedule_time: Between(new Date(), new Date(timeBuffer)),
        is_active: true,
        is_data_processed: true,
      },
      order: {
        schedule_time: 'ASC',
      },
    });
    const updatedCampaigns = campaigns.map((campaign) => ({
      ...campaign,
      status: CampaignStatus.IN_PROGRESS,
    }));
    await this.campaignRepository.save(updatedCampaigns);
    campaigns.forEach((campaign) => {
      const scheduleTime = new Date(campaign.schedule_time).getTime();
      const delayMs = Math.max(0, scheduleTime - new Date().getTime());
      setTimeout(async () => {
        try {
          await this.pushPublishRequestToSqs(campaign.id);
        } catch (error) {
          console.error(`Failed to send campaign ${campaign.id}:`, error);
        }
      }, delayMs);
    });
    return campaigns.length;
  }

  async pushProcessRequestToSqs(id: string, publishNow = false) {
    const url = `${this.configService.get<string>('consumer_url')}${
      Endpoints.PROCESS_CAMPAIGN
    }/${id}`;
    const headers = {
      Authorization: this.configService.get('util_token'),
    };
    let lambda = AwsGenericLambdaDto.createGenericLambdaDto(
      url,
      'POST',
      headers,
      { publishNow: publishNow.toString() },
      {},
    );
    await this.commonService.sendMessageToQueue(lambda);
  }

  async pushPublishRequestToSqs(campaignId: string) {
    const url = `${this.configService.get<string>('consumer_url')}${
      Endpoints.PUBLISH_CAMPAIGN
    }/${campaignId}`;
    const params = { id: campaignId };
    const headers = {
      Authorization: this.configService.get('util_token'),
    };
    let lambda = AwsGenericLambdaDto.createGenericLambdaDto(
      url,
      'POST',
      headers,
      params,
      {},
    );
    await this.commonService.sendMessageToQueue(lambda);
  }

  private async updateCampaignFields(
    dto: UpdateCampaignDto,
    campaign: CampaignEntity,
  ) {
    if (dto.name && dto.name !== campaign.name) {
      campaign.name = dto.name;
    }
    if (
      dto.notification_channel &&
      dto.notification_channel !== campaign.notification_channel
    ) {
      switch (dto.notification_channel) {
        case NotificationChannel.IN_APP:
          campaign.notification_channel = NotificationChannel.IN_APP;
          break;
        case NotificationChannel.PN:
          campaign.meta_data.pn_channel = dto.pn_channel;
          campaign.notification_channel = NotificationChannel.PN;
          break;
        case NotificationChannel.SMS:
          campaign.notification_channel = NotificationChannel.SMS;
          break;
        default:
          throw this.commonService.createHttpException(
            'Invalid notification channel',
            HttpStatus.BAD_REQUEST,
          );
      }
    }
    if (
      dto.schedule_time != null &&
      new Date(dto.schedule_time) != campaign.schedule_time
    ) {
      await this.validateScheduleTime(dto.schedule_time);
      campaign.schedule_time = new Date(dto.schedule_time);
    }
    if (
      dto.fillers != null &&
      dto.fillers !== JSON.stringify(campaign.meta_data.fillers)
    ) {
      campaign.meta_data.fillers = JSON.parse(dto.fillers);
    }
    if (dto.is_silent_pn) {
      campaign.meta_data.is_silent_pn = dto.is_silent_pn;
    }
    return campaign;
  }

  async processCampaignSheetData(campaign: CampaignEntity) {
    try {
      const file = await this.convertSheetToMuterFile(campaign);
      const parsedFile = await this.commonService.readCsvData(file);
      const parsedData =
        this.commonService.parseNotificationSheetByHeaderMapping(
          parsedFile.data,
          UploadBean.getHeaderMapping(),
        );
      const fillers = campaign.meta_data.fillers;
      const chunkSize = await this.notificationParamService.getNumberParamValue(
        'NOTIFICATION_BATCH_SIZE',
        500,
      );
      for (let i = 0; i < parsedData.length; i += chunkSize) {
        let chunk = parsedData.slice(i, i + chunkSize);
        chunk = await this.commonService.processNotificationSheetData(
          chunk,
          campaign,
          fillers,
        );
        const queueEntities = await this.mapProcessedSheetData(chunk);
        await this.notificationQueueService.save(queueEntities);
      }
      campaign.is_data_processed = true;
      await this.campaignRepository.save(campaign);
      return HttpStatus.OK;
    } catch (error) {
      campaign.status = CampaignStatus.FAILED;
      await this.campaignRepository.save(campaign);
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error processing campaign sheet data',
        error,
      );
      throw this.commonService.createHttpException(
        'Error processing campaign sheet data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async mapProcessedSheetData(chunk: UploadBean[]) {
    let queueEntities = [];
    for (const bean of chunk) {
      const entity = NotificationQueueEntity.createEntity(bean);
      queueEntities.push(entity);
    }
    return queueEntities;
  }

  private async convertSheetToMuterFile(campaign: CampaignEntity) {
    const url = campaign.meta_data.sheet_url;
    const res = await this.commonService.downloadFile(url);
    const filename = url.split('/').pop() || 'downloaded.csv';
    const stream = Readable.from(res);
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'text/csv',
      size: res.length,
      stream: stream,
      filename: filename,
      buffer: res,
    };
  }

  async processCampaignSheets() {
    const thresholdTime =
      await this.notificationParamService.getNumberParamValue(
        'PROCESS_SHEET_THRESHOLD_MINUTES',
        30,
      );
    const sheetProcessingInterval =
      await this.notificationParamService.getNumberParamValue(
        'SHEET_PROCESSING_INTERVAL_MINUTES',
        15,
      );
    const lowerLimit = new Date().getTime() + thresholdTime * 60 * 1000;
    const upperLimit = lowerLimit + sheetProcessingInterval * 60 * 1000;
    const campaigns = await this.campaignRepository.find({
      where: {
        status: CampaignStatus.SCHEDULED,
        schedule_time: Between(new Date(lowerLimit), new Date(upperLimit)),
        is_active: true,
        is_data_processed: false,
      },
    });
    for (const campaign of campaigns) {
      await this.processCampaignSheetData(campaign);
    }
  }

  async findById(id: string) {
    return await this.campaignRepository.findOne({
      where: { id, is_active: true },
    });
  }

  async purgeCampaignQueue() {
    const days = await this.notificationParamService.getNumberParamValue(
      'PURGE_QUEUE_DAYS',
      7,
    );
    await this.notificationQueueService.purgeQueueDataBefore(days);
  }
}
