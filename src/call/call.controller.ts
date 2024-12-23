import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { CallService } from './call.service';
import { ApiBody } from '@nestjs/swagger';
import { CallRequestDto } from './dto/call.request.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Controller('call')
@UseFilters(HttpExceptionFilter)
export class CallController {
  private readonly logger = new CustomLogger(CallController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private callService: CallService,
  ) {}

  @ApiBody({ type: CallRequestDto })
  @Post('exotel')
  @HttpCode(HttpStatus.OK)
  async makeDualCall(@Body() request: CallRequestDto) {
    return this.callService.makeDualCall(request);
  }
}
