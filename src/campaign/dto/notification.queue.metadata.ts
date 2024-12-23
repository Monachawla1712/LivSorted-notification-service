import { IsNumber, IsOptional, IsString } from 'class-validator';

export class NotificationQueueMetadata {
  @IsString()
  userId: string;

  @IsString()
  templateName: string;

  @IsOptional()
  fillers: {};

  @IsOptional()
  phoneNumber: string;

  @IsString()
  templateId: string;

  @IsString()
  campaignId: string;

  @IsOptional()
  @IsNumber()
  validDays: number;
}
