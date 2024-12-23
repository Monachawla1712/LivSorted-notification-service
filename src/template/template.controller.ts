import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { TemplateService } from './template.service';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateTemplateDto } from './dto/create_template.dto';
import { TemplateEntity } from './template.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { UpdateTemplateDto } from './dto/update_template.dto';

@Controller('template')
@UseFilters(HttpExceptionFilter)
export class TemplateController {
  private readonly logger = new CustomLogger(TemplateController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private templateService: TemplateService,
  ) {}

  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ type: TemplateEntity })
  @Post()
  async createTemplate(
    @Body() request: CreateTemplateDto,
  ): Promise<TemplateEntity> {
    return this.templateService.createTemplate(request);
  }

  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({ type: TemplateEntity })
  @Patch()
  async updateTemplate(
    @Body() request: UpdateTemplateDto,
  ): Promise<TemplateEntity> {
    return this.templateService.updateTemplate(request);
  }

  @Get()
  async getTemplatesPaginated(
    @Query('page') page = 1,
    @Query('limit') limit = 500,
    @Query('search') search: string,
  ) {
    return this.templateService.getTemplateList(page, limit, search);
  }
}
