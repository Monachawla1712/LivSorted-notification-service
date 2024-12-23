import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Headers,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  Get,
  HttpException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { PnService } from './pn.service';
import { ApiBody } from '@nestjs/swagger';
import { PnRequestDto } from './dto/pn.request.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommonService } from 'src/core/common/common.service';
import { ParseResult } from 'src/core/common/dto/parse-result';
import { NotificationParamsService } from 'src/notification-params/notification-params.service';
import { ClevertapService } from 'src/clevertap/clevertap.service';
import { ClevertapNotificationRequestDto } from 'src/clevertap/dto/clevertap-notification-request.dto';
import { NotificationSendChannel } from 'src/core/enums/notification.send.channel';
import { UploadBean } from '../core/common/sheet-upload/upload.bean';
import { NotificationParams } from '../core/common/constants';

@Controller('pn')
@UseFilters(HttpExceptionFilter)
export class PnController {
  private readonly logger = new CustomLogger(PnController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private pnService: PnService,
    private commonService: CommonService,
    private notificationParamService: NotificationParamsService,
    private clevertapService: ClevertapService,
  ) {}

  @ApiBody({ type: PnRequestDto })
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendPushNotifications(
    @Body() request: PnRequestDto[],
    @Query('channel') channel,
  ) {
    let sendNotificationChannel;
    if (
      channel &&
      (channel === NotificationSendChannel.Clevertap ||
        channel === NotificationSendChannel.Onesignal)
    ) {
      sendNotificationChannel = channel;
    } else {
      const dbChannel = await this.notificationParamService.getStringParamValue(
        'SEND_NOTIFICATION_CHANNEL',
        NotificationSendChannel.Clevertap,
      );
      sendNotificationChannel = dbChannel;
    }
    if (sendNotificationChannel === NotificationSendChannel.Clevertap) {
      return this.commonService.processInBatches(
        request as ClevertapNotificationRequestDto[],
        1000,
        async (batch) => {
          await this.clevertapService.sendClevertapNotifications(batch);
        },
      );
    } else if (sendNotificationChannel === NotificationSendChannel.Onesignal) {
      return this.commonService.processInBatches(
        request,
        1000,
        async (batch) => {
          await this.pnService.sendPushNotifications(batch);
        },
      );
    }
  }

  @Get()
  async getPushNotifications(@Headers('userId') userId: string) {
    return this.pnService.getPushNotifications(userId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async pnNotificationSheetUpload(
    @UploadedFile() file,
    @Headers('userId') userId,
    @Query('isSilentPN') isSilentPN,
  ) {
    const pnNotificationUploadBean =
      await this.validateNotificationSheetAndParse(file);
    pnNotificationUploadBean.headerMapping = UploadBean.getHeaderMapping();
    if (pnNotificationUploadBean.failedRows.length == 0) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        pnNotificationUploadBean.successRows,
        isSilentPN && isSilentPN == 'true'
          ? 'silent-push-notification'
          : 'push-notification',
        userId,
      );
      pnNotificationUploadBean.key = bulkUploadData.accessKey;
    }
    return pnNotificationUploadBean;
  }

  @Post('upload/save')
  async pnNotificationSheetUploadSave(
    @Headers('userId') userId: string,
    @Query('key') key,
    @Query('cancel') cancel,
    @Query('channel') channel,
    @Query('isSilentPN') isSilentPN,
  ) {
    const bulkUploadData = await this.validateAndGetSheetDataByKey(
      key,
      isSilentPN && isSilentPN == 'true'
        ? 'silent-push-notification'
        : 'push-notification',
    );
    const data = bulkUploadData.jsonData.data.map((item: any) => ({
      userId: item.userId as string,
      templateName: item.templateName as string,
      fillers: item.fillers as Map<string, string>,
    }));
    if (cancel == null) {
      bulkUploadData.status = 1;
      if (isSilentPN && isSilentPN == 'true') {
        return this.commonService.processInBatches(
          data as PnRequestDto[],
          1000,
          async (batch) => {
            await this.pnService.sendSilentPN(batch);
          },
        );
      } else {
        let sendNotificationChannel;

        if (
          channel &&
          (channel === NotificationSendChannel.Clevertap ||
            channel === NotificationSendChannel.Onesignal)
        ) {
          sendNotificationChannel = channel;
        } else {
          const dbChannel =
            await this.notificationParamService.getStringParamValue(
              NotificationParams.SEND_NOTIFICATION_CHANNEL,
              NotificationSendChannel.Clevertap,
            );
          sendNotificationChannel = dbChannel;
        }
        if (sendNotificationChannel == NotificationSendChannel.Clevertap) {
          return this.commonService.processInBatches(
            data as ClevertapNotificationRequestDto[],
            1000,
            async (batch) => {
              await this.clevertapService.sendClevertapNotifications(batch);
            },
          );
        } else if (
          sendNotificationChannel == NotificationSendChannel.Onesignal
        ) {
          await this.pnService.sendPushNotifications(data as PnRequestDto[]);
        }
      }
      await this.commonService.saveBulkUploadData(bulkUploadData);
    } else if (cancel == 1) {
      bulkUploadData.status = 0;
      await this.commonService.saveBulkUploadData(bulkUploadData);
    } else {
      throw new HttpException(
        { message: 'Invalid input for cancel' },
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true };
  }

  private async validateNotificationSheetAndParse(file: any) {
    const results = await this.commonService.readCsvData(file);
    const parsedData = this.parseNotificationSheetByHeaderMapping(results.data);
    const pnUploadBean: ParseResult<UploadBean> =
      await this.pnService.validateNotificationSheetUpload(parsedData);
    return pnUploadBean;
  }

  private parseNotificationSheetByHeaderMapping(csvRows) {
    const pnUploadBeans: UploadBean[] = [];
    const headerMap = this.commonService.getHeaderMap(
      UploadBean.getHeaderMapping(),
    );
    for (const csvRow of csvRows) {
      const processedRow = new UploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      pnUploadBeans.push(processedRow);
    }
    return pnUploadBeans;
  }

  private async validateAndGetSheetDataByKey(key: any, uploadType: string) {
    const bulkUploadData = await this.commonService.getBulkUploadEntryByKey(
      uploadType,
      key,
    );
    if (bulkUploadData == null) {
      throw new HttpException(
        { message: 'No Bulk Upload data found for given key and module.' },
        HttpStatus.NOT_FOUND,
      );
    }
    return bulkUploadData;
  }
}
