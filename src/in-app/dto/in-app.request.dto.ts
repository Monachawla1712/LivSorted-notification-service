import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { NotificationRequestDto } from '../../notification/dto/notification.request.dto';

export class InAppRequestDto extends NotificationRequestDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  validDays: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  validHours: number;
}
