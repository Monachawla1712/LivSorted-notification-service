import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { EmailService } from './email.service';
import { EmailNotificationDto } from './dto/email.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Controller('email')
@UseFilters(HttpExceptionFilter)
export class EmailController {
  private readonly logger = new CustomLogger(EmailController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private emailService: EmailService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() email) {
    const emailDto = new EmailNotificationDto();
    Object.assign(emailDto, email);
    return this.emailService.sendEmail(emailDto);
  }
}
