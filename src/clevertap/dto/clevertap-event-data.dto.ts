import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString } from 'class-validator';

export class ClevertapEventDataDto {
  @ApiProperty()
  @IsString()
  identity: string;

  @ApiProperty()
  @IsNumber()
  ts: number;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  evtName: string;

  @ApiProperty()
  @IsObject()
  evtData: Map<string, any>;
}
