import { NotificationRequestDto } from '../../notification/dto/notification.request.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WhatsappMessageRequestListDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => WhatsappMessageRequestDto)
  messageRequests: WhatsappMessageRequestDto[];
}

export class WhatsappMessageRequestDto extends NotificationRequestDto {
  @ApiProperty()
  @IsString()
  messageType: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  videoTemplateId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  videoId: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ each: true })
  videoParams: string[];

  @ApiProperty()
  @IsOptional()
  @IsString({ each: true })
  params: string[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  url: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  fileName: string;
}
