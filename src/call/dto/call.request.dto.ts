import { NotificationRequestDto } from '../../notification/dto/notification.request.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CallRequestDto extends NotificationRequestDto{
  @ApiProperty()
  @IsOptional()
  fromPhoneNumber: string;

  @ApiProperty()
  @IsOptional()
  toPhoneNumber: string;
}
