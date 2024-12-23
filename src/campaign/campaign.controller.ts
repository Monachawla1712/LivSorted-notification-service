import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create.campaign.dto';
import { NotificationChannel } from '../core/enums/notification.channel';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCampaignDto } from './dto/update.campaign';
import { CampaignStatus } from '../core/enums/campaign.status';

@Controller('campaign')
@UseFilters(HttpExceptionFilter)
export class CampaignController {
  private readonly logger = new CustomLogger(CampaignController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private campaignService: CampaignService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @UploadedFile() file,
    @Headers('userId') userId: string,
  ) {
    this.logger.log(
      this.asyncContext.get('traceId'),
      `createCampaign called with data: ${JSON.stringify(createCampaignDto)}`,
    );
    return this.campaignService.createCampaign(createCampaignDto, file, userId);
  }

  @Put('/:id')
  @UseInterceptors(FileInterceptor('file'))
  async updateCampaign(
    @Param('id') id: string,
    @UploadedFile() file,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @Headers('userId') userId: string,
  ) {
    this.logger.log(
      this.asyncContext.get('traceId'),
      `updateCampaign called with data: ${JSON.stringify(updateCampaignDto)}`,
    );
    return this.campaignService.updateCampaign(
      id,
      updateCampaignDto,
      file,
      userId,
    );
  }

  @Post('/publish/sqs')
  async sendCampaignsToSqs() {
    this.logger.log(
      this.asyncContext.get('traceId'),
      'sendCampaignToSqs::triggered',
    );
    return this.campaignService.sendCampaignToSqs();
  }

  @Post('/publish/:id')
  async publishCampaign(@Param('id') id: string) {
    this.logger.log(this.asyncContext.get('traceId'), `publishCampaign, ${id}`);
    return this.campaignService.publishScheduledCampaign(id);
  }

  @Post('/data/process')
  async processCampaignSheets() {
    this.logger.log(
      this.asyncContext.get('traceId'),
      'processCampaignSheets::triggered',
    );
    return this.campaignService.processCampaignSheets();
  }

  @Post('/queue/purge')
  async purgeCampaignQueue() {
    this.logger.log(
      this.asyncContext.get('traceId'),
      'purgeCampaignQueue::triggered',
    );
    return this.campaignService.purgeCampaignQueue();
  }

  @Post('/data/process/:id')
  async processCampaignSheet(
    @Param('id') id: string,
    @Query('publishNow') publishNow: boolean,
  ) {
    this.logger.log(
      this.asyncContext.get('traceId'),
      `processCampaignSheet, ${id}`,
    );
    let campaign;
    try {
      campaign = await this.campaignService.findById(id);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        `Error while fetching campaign with id ${id}`,
        e,
      );
      throw e;
    }
    const res = await this.campaignService.processCampaignSheetData(campaign);
    if (publishNow) {
      await this.campaignService.pushPublishRequestToSqs(campaign.id);
    }
    return res;
  }

  @Get()
  async getPaginatedCampaigns(
    @Query('page') page = 1,
    @Query('limit') limit = 200,
    @Query('search') search: string,
    @Query('channel') type: NotificationChannel,
    @Query('status') status: CampaignStatus,
  ) {
    this.logger.log(this.asyncContext.get('traceId'), 'getPaginatedCampaigns');
    return this.campaignService.getPaginatedCampaigns(
      page,
      limit,
      search,
      type,
      status,
    );
  }
}
