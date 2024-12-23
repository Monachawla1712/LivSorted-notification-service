import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { SmsService } from './sms.service';
import { SmsRequestDto } from './dto/sms.request.dto';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CustomLogger } from '../core/custom-logger';

@Controller('sms')
@UseFilters(HttpExceptionFilter)
export class SmsController {
  private readonly logger = new CustomLogger(SmsController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private smsService: SmsService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() request: SmsRequestDto[]) {
    return this.smsService.sendMultipleGupshupSms(request);
  }
}
