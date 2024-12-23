import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { WhatsappService } from './whatsapp.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { WhatsappOptInRequestDto } from './dto/whatsapp_opt_in_request.dto';
import { WhatsappMessageRequestListDto } from './dto/whatsappMessage.request.dto';

@Controller('whatsapp')
@UseFilters(HttpExceptionFilter)
export class WhatsappController {
  private readonly logger = new CustomLogger(WhatsappController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private whatsappService: WhatsappService,
  ) {}

  @Post('opt-in')
  async setWhatsappOptIn(
    @Body() request: WhatsappOptInRequestDto,
  ): Promise<void> {
    return this.whatsappService.setGupshupWhatsappOptIn(request);
  }
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendWhatsappMessage(@Body() request: WhatsappMessageRequestListDto) {
    return await this.whatsappService.sendMultipleWhatsappMessages(
      request.messageRequests,
    );
  }
}
