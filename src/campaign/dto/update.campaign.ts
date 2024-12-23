import { IsOptional, IsString } from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional()
  schedule_time: string;

  @IsString()
  status: string;

  @IsOptional()
  name: string;

  @IsOptional()
  notification_channel: string;

  @IsOptional()
  pn_channel: string;

  @IsOptional()
  fillers: string;

  @IsOptional()
  is_silent_pn: boolean;
}
