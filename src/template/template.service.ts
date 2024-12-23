import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TemplateEntity } from './template.entity';
import { CreateTemplateDto } from './dto/create_template.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { UpdateTemplateDto } from './dto/update_template.dto';
import { NotificationChannel } from 'src/core/enums/notification.channel';
import { ValidityType } from '../core/common/constants';
import { TemplateMetadata } from './template_metadata';

@Injectable()
export class TemplateService {
  private readonly logger = new CustomLogger(TemplateService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(TemplateEntity)
    private readonly templateRepository: Repository<TemplateEntity>,
  ) {}

  async getTemplateByName(templateName: string): Promise<TemplateEntity> {
    const template = await this.findTemplateByName({
      name: templateName,
      isActive: true,
    });
    if (template == null) {
      throw new HttpException(
        { message: 'Template not found.' },
        HttpStatus.NOT_FOUND,
      );
    }
    return template;
  }

  async findTemplateByName(filters: any): Promise<TemplateEntity> {
    const filter: FindOptionsWhere<TemplateEntity> = {};
    if (filters.name) filter.name = ILike(filters.name);
    if (filters.isActive) filter.is_active = filters.isActive;
    return await this.templateRepository.findOne({
      where: filter,
    });
  }

  async validateTemplateNameConflict(templateName: string) {
    const template = await this.findTemplateByName({
      name: templateName,
    });
    if (template != null) {
      throw new HttpException(
        { message: 'Template name conflicts.' },
        HttpStatus.CONFLICT,
      );
    }
  }

  async validateTemplateMessageExpiryTime(templateMetadata: TemplateMetadata) {
    let { validity_type, valid_days, valid_hours } = templateMetadata;
    if (valid_hours && valid_hours > 24) {
      if (!valid_days) valid_days = 0;
      valid_days += Math.floor(valid_hours / 24);
      valid_hours %= 24;
    }
    validity_type =
      Number(valid_days) > 0 || Number(valid_hours) > 24
        ? ValidityType.DAYS
        : ValidityType.HOURS;
    templateMetadata.valid_days = valid_days;
    templateMetadata.valid_hours = valid_hours;
    templateMetadata.validity_type = validity_type;
  }

  async createTemplate(dto: CreateTemplateDto): Promise<TemplateEntity> {
    await this.validateTemplateNameConflict(dto.name);
    await this.validateTemplateMessageExpiryTime(dto.metadata);
    return await this.templateRepository.save(dto);
  }

  async updateTemplate(dto: UpdateTemplateDto): Promise<TemplateEntity> {
    const template = await this.templateRepository.findOneBy({ id: dto.id });
    if (template.name != dto.name) {
      await this.validateTemplateNameConflict(dto.name);
    }
    for (const key of Object.keys(dto)) {
      if (key != null) {
        template[key] = dto[key];
      }
    }
    await this.validateTemplateMessageExpiryTime(dto.metadata);
    return await this.templateRepository.save(template);
  }

  async getTemplateList(page: number, limit: number, query: string) {
    const whereClause: FindOptionsWhere<TemplateEntity> = !query
      ? {}
      : {
          name: ILike(`%${query}%`),
        };
    const [stores, total] = await this.templateRepository.findAndCount({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data: stores,
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Number(totalPages),
    };
  }

  async getTemplatesByNameList(names: string[], channel: NotificationChannel) {
    return await this.templateRepository.find({
      where: { name: In(names), is_active: true, channel },
    });
  }

  async getTemplateById(template_id: string) {
    return await this.templateRepository.findOne({
      where: { id: template_id },
    });
  }
}
