import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '../../core/enums/notification.channel';
import { TemplateMetadata } from '../template_metadata';

export class UpdateTemplateDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @IsOptional()
  @ApiProperty()
  @IsString()
  title: string;

  @IsOptional()
  @ApiProperty()
  @IsString()
  body: string;

  @IsString()
  entity_type: string;

  @IsOptional()
  metadata: TemplateMetadata;
}
