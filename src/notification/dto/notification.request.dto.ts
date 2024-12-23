import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class NotificationRequestDto {
  @ApiProperty()
  @IsOptional()
  userId: string;

  @ApiProperty()
  @IsString()
  templateName: string;

  @ApiProperty()
  @IsOptional()
  fillers: Map<string, string>;

  @ApiProperty()
  @IsOptional()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  templateId: string;

  @IsString()
  @IsOptional()
  campaignId: string;
}
