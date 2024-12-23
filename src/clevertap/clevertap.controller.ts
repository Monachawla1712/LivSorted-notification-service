import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { ClevertapService } from './clevertap.service';
import { ApiBody } from '@nestjs/swagger';
import { ClevertapEventRequestDto } from './dto/clevertap-event-request.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { ClevertapNotificationRequestDto } from './dto/clevertap-notification-request.dto';
import { ClevertapProfileUpdateRequestDto } from './dto/clevertap-profile-update-request.dto';

@Controller('clevertap')
@UseFilters(HttpExceptionFilter)
export class ClevertapController {
  private readonly logger = new CustomLogger(ClevertapController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private clevertapService: ClevertapService,
  ) {}

  @ApiBody({ type: ClevertapEventRequestDto })
  @Post()
  @HttpCode(HttpStatus.OK)
  async sendEvent(@Body() request: ClevertapEventRequestDto) {
    return this.clevertapService.sendEvent(request);
  }

  @ApiBody({ type: ClevertapProfileUpdateRequestDto })
  @Post('profile-update')
  @HttpCode(HttpStatus.OK)
  async sendProfileUpdate(@Body() request: ClevertapProfileUpdateRequestDto) {
    return this.clevertapService.sendProfileUpdate(request);
  }

  @ApiBody({ type: ClevertapNotificationRequestDto })
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendPushNotifications(
    @Body() request: ClevertapNotificationRequestDto[],
  ) {
    return this.clevertapService.sendClevertapNotifications(request);
  }
}
