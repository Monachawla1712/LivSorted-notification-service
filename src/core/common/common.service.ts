import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { UserEntity } from '../../notification/user.entity';
import { NotificationChannel } from '../enums/notification.channel';
import { CustomLogger } from '../custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { Readable } from 'stream';
import { parse } from 'papaparse';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';
import { ParseResult } from './dto/parse-result';
import { TemplateEntity } from '../../template/template.entity';
import { UploadBean } from './sheet-upload/upload.bean';
import { ErrorBean } from './dto/error-bean';
import { TemplateService } from '../../template/template.service';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config/configuration';
import { RestApiService } from './rest-api-service';
import { AwsGenericLambdaDto } from './dto/aws.generic.lambda.dto';
import { NotificationParamsService } from '../../notification-params/notification-params.service';
import { AwsService } from './aws.service';
import { CampaignEntity } from '../../campaign/campaign.entity';

@Injectable()
export class CommonService {
  private readonly logger = new CustomLogger(CommonService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(BulkUploadEntity)
    private readonly bulkUploadRepository: Repository<BulkUploadEntity>,
    private templateService: TemplateService,
    private configService: ConfigService<Config, true>,
    private restApiService: RestApiService,
    private readonly paramService: NotificationParamsService,
    private readonly awsService: AwsService,
    private readonly notificationParamService: NotificationParamsService,
  ) {}

  toTimestamp(strDate): number {
    return Date.parse(strDate) / 1000;
  }

  isNotNullOrEmpty(str: string): boolean {
    return !(str == null || str.trim() == '');
  }

  async getUserIdentity(
    userId: string,
    channel: NotificationChannel,
  ): Promise<{ identity: string; name: string }> {
    const user = await this.userRepository.findOneBy({
      id: userId,
      is_active: true,
      is_deleted: false,
    });

    if (user == null) {
      throw new HttpException(
        { message: 'User not found.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const identity =
      channel == NotificationChannel.EMAIL ? user.email : user.phone_number;

    if (!this.isNotNullOrEmpty(identity)) {
      throw new HttpException(
        { message: 'User phone/email not found.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return { identity: identity, name: user.name };
  }

  async getAllUsers(userId: string[]) {
    const user = await this.userRepository.find({
      where: { id: In(userId), is_active: true, is_deleted: false },
    });
    return new Map(
      user.map((user) => {
        return [user.id, user];
      }),
    );
  }

  async getAllUsersInternal(
    userId: string[],
  ): Promise<Map<string, UserEntity>> {
    const getUsersApi =
      this.configService.get<string>('util_url') + `/auth/internal/users`;
    try {
      const res = await this.restApiService.makeRequest({
        url: getUsersApi,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: this.configService.get<string>('util_token'),
        },
        data: { ids: userId },
      });
      return new Map(
        res.map((user: UserEntity) => {
          return [user.id, user as UserEntity];
        }),
      );
    } catch (e) {
      throw new HttpException(
        {
          message: 'Failed to fetch user details.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  findFillerKey(filler: string): string {
    const key = filler.match(/\${([a-zA-Z0-9_. ]*)/);
    return key ? key[1].toLowerCase() : null;
  }

  findFillerDefault(filler: string): string {
    const value = filler.match(/default\('[a-zA-Z0-9_ ]*/);
    return value ? (value[0] ? value[0].replace("default('", '') : null) : null;
  }

  findFillers(str: string): Map<string, string> {
    const mp = new Map<string, string>();
    if (this.isNotNullOrEmpty(str)) {
      const fillers = str.match(
        /\${[a-zA-Z0-9_. ]*\??\s*(?:default\('[a-zA-Z0-9_ ]*'\))?}/g,
      );
      if (fillers && fillers.length > 0) {
        fillers.forEach((filler) => {
          if (this.isNotNullOrEmpty(this.findFillerKey(filler))) {
            mp.set(this.findFillerKey(filler), filler);
          }
        });
      }
    }
    return mp;
  }

  replaceFillers(str: string, fillers: Map<string, string>): string {
    if (this.isNotNullOrEmpty(str)) {
      const fillerMap = this.findFillers(str);

      const fillersLowercase: Map<string, string> = new Map();
      if (fillers instanceof Map) {
        fillers.forEach((value, key) => {
          fillersLowercase.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(fillers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            fillersLowercase.set(key.toLowerCase(), value);
          }
        });
      }
      fillerMap.forEach((v, key) => {
        const lowercaseKey = key.toLowerCase();
        if (fillersLowercase.has(lowercaseKey)) {
          str = str.replace(v, fillersLowercase.get(lowercaseKey)!);
        } else {
          str = str.replace(v, this.findFillerDefault(v));
        }
      });
    }
    return str;
  }

  async getClientEmail(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user.email;
  }

  async readCsvData(file) {
    const fileBufferInBase64: string = file.buffer.toString('base64');
    const buffer = Buffer.from(fileBufferInBase64, 'base64');
    const dataStream = Readable.from(buffer);
    return await this.readCSVData(dataStream);
  }

  async readCSVData(dataStream): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedCsv = parse(dataStream, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  async createNewBulkUploadEntry(
    data: object[],
    module: string,
    userId: string,
  ) {
    const bulkUploadEntity = new BulkUploadEntity(data, module, userId);
    return this.bulkUploadRepository.save(bulkUploadEntity);
  }

  getHeaderMap(headerMapping: string) {
    const keyValuePairs = headerMapping.split(',');
    const resultMap = new Map();
    keyValuePairs.forEach((pair) => {
      const [value, key] = pair.split(':');
      resultMap.set(key, value);
    });
    return resultMap;
  }

  async getBulkUploadEntryByKey(module: string, accessKey: string) {
    return this.bulkUploadRepository.findOne({
      where: { accessKey: accessKey, module: module, status: IsNull() },
    });
  }

  saveBulkUploadData(bulkUploadData: BulkUploadEntity) {
    return this.bulkUploadRepository.save(bulkUploadData);
  }

  createHttpException(
    message: string,
    status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ): HttpException {
    return new HttpException({ message }, status);
  }

  extractKeysFromTemplates(templates: string[]): string[] {
    const regex = /\${([A-Za-z_]+(?:\.[A-Za-z_]+)?)\??/g;
    const keys: Set<string> = new Set<string>();

    templates.forEach((template) => {
      template.replace(regex, (_, key) => {
        keys.add(key);
        return '';
      });
    });

    return Array.from(keys);
  }

  checkFillerKeys(fieldNames, data) {
    const fillers: Map<string, string> = new Map();
    const missingFields = [];

    const lowerCaseDataKeys = new Set(
      Object.keys(data).map((key) => key.toLowerCase()),
    );

    fieldNames?.forEach((fieldName) => {
      const lowerCaseFieldName = fieldName.toLowerCase();
      const matchingKey = lowerCaseDataKeys.has(lowerCaseFieldName)
        ? lowerCaseFieldName
        : null;
      if (matchingKey !== null) {
        fillers[fieldName] = data[fieldName]?.toString();
      } else {
        missingFields.push(lowerCaseFieldName);
      }
    });

    lowerCaseDataKeys.forEach((lowerCaseKey) => {
      if (!fillers.hasOwnProperty(lowerCaseKey)) {
        const originalKey = [...Object.keys(data)].find(
          (key) => key.toLowerCase() === lowerCaseKey,
        );
        if (originalKey) {
          fillers[originalKey] = data[originalKey].toString();
        }
      }
    });

    return { fillers, missingFields };
  }

  createKeyValuePair(rowData) {
    if (!rowData.trim()) {
      return '{}';
    }

    const keyValuePairs = rowData.split(',').map((pair) => pair.trim());

    const keyValueObject = keyValuePairs.reduce((acc, pair) => {
      const [key, value] = pair.split(':').map((item) => item.trim());
      const cleanedValue = value.replace(/^['"]|['"]$/g, '').trim();
      acc[key] = cleanedValue;
      return acc;
    }, {});

    return JSON.stringify(keyValueObject);
  }

  calculateDateForValidity(days: number, hours: number): Date {
    const date = new Date();
    if (days > 0) {
      date.setDate(date.getDate() + days - 1); // add no of valid days to date and subtract 1 as we are including current day
      date.setHours(23, 59, 59, 999); // set time to 23:59:59 i.e end of day
    }
    if (hours > 0) {
      const integerHours = Math.floor(hours);
      const fractionalHours = hours - integerHours;
      date.setHours(date.getHours() + integerHours); // add integer part of hours
      date.setMinutes(date.getMinutes() + fractionalHours * 60); // add fractional part of hours as minutes
    }
    return date;
  }

  async parseAndValidateSheet(file: any): Promise<ParseResult<UploadBean>> {
    const parsedData = await this.parseSheet(file);
    return this.validateParsedData(parsedData);
  }

  async parseSheet(file: any): Promise<UploadBean[]> {
    const results = await this.readCsvData(file);
    return this.parseNotificationSheetByHeaderMapping(
      results.data,
      UploadBean.getHeaderMapping(),
    );
  }

  validateParsedData(parsedData: UploadBean[]): ParseResult<UploadBean> {
    const parseResults = new ParseResult<UploadBean>();
    for (const rawBean of parsedData) {
      if (rawBean.userId == null) {
        rawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Id is mandatory', 'userId'),
        );
      }
      if (rawBean.errors.length == 0) {
        parseResults.successRows.push(rawBean);
      } else {
        parseResults.failedRows.push(rawBean);
      }
    }
    parseResults.headerMapping = UploadBean.getHeaderMapping();
    return parseResults;
  }

  parseNotificationSheetByHeaderMapping(
    csvRows: any[],
    headerMapping: string,
  ): UploadBean[] {
    const uploadBeans: UploadBean[] = [];
    const headerMap = this.getHeaderMap(headerMapping);
    for (const csvRow of csvRows) {
      const processedRow = new UploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      uploadBeans.push(processedRow);
    }
    return uploadBeans;
  }

  async processNotificationSheetData(
    uploadBeans: UploadBean[],
    campaign: CampaignEntity,
    campaignFillers: Map<string, string>,
  ) {
    const template = await this.templateService.getTemplateById(
      campaign.template_id,
    );
    const commonFillers = campaignFillers;
    const userIds = new Set(uploadBeans.map((bean) => bean.userId));
    let existingUsersMap;
    try {
      existingUsersMap = await this.getAllUsersInternal([...userIds]);
    } catch (error) {
      this.logger.error('Failed to fetch user details for batch', error);
      return [];
    }
    const keys = this.extractKeysFromTemplates([template.title, template.body]);
    const res = [];

    for (const rawBean of uploadBeans) {
      const user = existingUsersMap.get(rawBean.userId);
      if (!user) {
        continue;
      }
      const userKeys = Object.keys(user);
      let fillers = this.checkFillerKeys(keys, commonFillers);
      fillers = this.populateMissingUserFields(
        fillers,
        user,
        userKeys,
        template,
      );
      if (fillers.missingFields.length) {
        continue;
      }
      rawBean.userId = rawBean.userId.toString();
      rawBean.fillers = fillers.fillers;
      rawBean.campaignId = campaign.id;
      res.push(rawBean);
    }
    return res;
  }

  populateMissingUserFields(
    fillers: { fillers: Map<string, string>; missingFields: string[] },
    user: UserEntity,
    userKeys: string[],
    template: TemplateEntity,
  ) {
    const updatedFillers = fillers.fillers;
    const updatedMissingFields = [];
    let templateBodyFillerMap = this.findFillers(template.body);
    let templateTitleFillerMap = this.findFillers(template.title);
    fillers.missingFields.forEach((field) => {
      const sanitizedField = field.toLowerCase().startsWith('user.')
        ? field.split('.')[1].toLowerCase()
        : field;
      if (userKeys.includes(sanitizedField)) {
        updatedFillers[field] = user[sanitizedField] ?? 'User';
      } else {
        if (templateBodyFillerMap.has(field)) {
          updatedFillers[field] = this.findFillerDefault(
            templateBodyFillerMap.get(field),
          );
        } else if (templateTitleFillerMap.has(field)) {
          updatedFillers[field] = this.findFillerDefault(
            templateTitleFillerMap.get(field),
          );
        } else {
          updatedMissingFields.push(field);
        }
      }
    });

    return {
      fillers: updatedFillers,
      missingFields: updatedMissingFields,
    };
  }

  async sendMessageToQueue(lambdaBean: AwsGenericLambdaDto): Promise<void> {
    try {
      const messageString = JSON.stringify(lambdaBean);
      const queueUrl = await this.paramService.getStringParamValue(
        'SQS_QUEUE_URL',
        'https://sqs.ap-south-1.amazonaws.com/482450211820/generic-queue',
      );
      await this.awsService.sendMessage(queueUrl, messageString, 0);
      this.logger.log(
        this.asyncContext.get('traceId'),
        `Message: ${messageString} sent to queue: ${queueUrl}`,
      );
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.logger.log(
          'Some error occurred while converting data to JSON',
          e.toString(),
        );
      } else {
        this.logger.log(
          'Some error occurred while updating consumer status using queue',
          e.toString(),
        );
      }
    }
  }

  async downloadFile(url: string) {
    return await this.restApiService.makeRequest({
      url: url,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  }

  async processInBatches<T>(
    items: T[],
    batchSize: number,
    processBatch: (batch: T[]) => Promise<void>,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }
}
