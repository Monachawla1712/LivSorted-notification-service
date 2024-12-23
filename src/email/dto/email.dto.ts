import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { NotificationRequestDto } from '../../notification/dto/notification.request.dto';

export class EmailNotificationDto extends NotificationRequestDto {
  @ApiProperty()
  @IsEmail()
  emailId: string;

  @ApiProperty()
  attachmentUrl: string;
}
