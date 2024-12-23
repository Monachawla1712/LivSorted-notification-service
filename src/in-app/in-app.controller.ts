import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { InAppService } from './in-app.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseResult } from 'src/core/common/dto/parse-result';
import { CommonService } from 'src/core/common/common.service';
import { InAppRequestDto } from './dto/in-app.request.dto';
import { UploadBean } from '../core/common/sheet-upload/upload.bean';

@Controller('in-app')
@UseFilters(HttpExceptionFilter)
export class InAppController {
  private readonly logger = new CustomLogger(InAppController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private inAppService: InAppService,
    private commonService: CommonService,
  ) {}

  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.inAppService.markAsRead(id);
  }

  @Get()
  async getInAppNotification(@Headers('userId') userId: string) {
    return this.inAppService.getInAppNotification(userId);
  }

  @Post('stop')
  async stopInAppNotifications(
    @Body() request: { date: Date; templateName: string; time: string },
  ) {
    return this.inAppService.stopInAppNotifications(request);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async inAppNotificationSheetUpload(
    @UploadedFile() file,
    @Headers('userId') userId,
  ) {
    const inAppNotificationUploadBean =
      await this.validateNotificationSheetAndParse(file);
    inAppNotificationUploadBean.headerMapping = UploadBean.getHeaderMapping();
    if (inAppNotificationUploadBean.failedRows.length == 0) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        inAppNotificationUploadBean.successRows,
        'in-app-notification',
        userId,
      );
      inAppNotificationUploadBean.key = bulkUploadData.accessKey;
    }
    return inAppNotificationUploadBean;
  }

  @Post('upload/save')
  async inAppNotificationSheetUploadSave(
    @Headers('userId') userId: string,
    @Query('key') key,
    @Query('cancel') cancel,
  ) {
    const bulkUploadData = await this.validateAndGetSheetDataByKey(
      key,
      'in-app-notification',
    );
    const data = bulkUploadData.jsonData.data.map((item: any) => ({
      userId: item.userId as string,
      templateName: item.templateName as string,
      fillers: item.fillers as Map<string, string>,
      validDays: item.validDays as number,
      validHours: item.validHours as number,
    }));
    if (cancel == null) {
      bulkUploadData.status = 1;
      await this.commonService.processInBatches(
        data as InAppRequestDto[],
        1000,
        async (batch) => {
          await this.inAppService.sendInAppNotifications(batch);
        },
      );
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
    const inAppUploadBean: ParseResult<UploadBean> =
      await this.inAppService.validateNotificationSheetUpload(parsedData);
    return inAppUploadBean;
  }

  private parseNotificationSheetByHeaderMapping(csvRows) {
    const inAppUploadBeans: UploadBean[] = [];
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
      inAppUploadBeans.push(processedRow);
    }
    return inAppUploadBeans;
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
