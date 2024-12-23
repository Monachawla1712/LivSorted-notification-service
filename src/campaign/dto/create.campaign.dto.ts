import { NotificationChannel } from '../../core/enums/notification.channel';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  template_id: string;

  @IsNotEmpty()
  notification_channel: NotificationChannel;

  @IsOptional()
  schedule_time: Date;

  @IsString()
  status: string;

  @IsOptional()
  fillers: string;

  @IsOptional()
  pn_channel: string;

  @IsOptional()
  is_silent_pn: boolean;
}
