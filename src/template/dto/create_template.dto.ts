import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '../../core/enums/notification.channel';
import { TemplateMetadata } from '../template_metadata';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsBoolean()
  is_active: boolean;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  body: string;

  @IsString()
  entity_type: string;

  @IsOptional()
  metadata: TemplateMetadata;
}
