import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class ClevertapProfileUpdateDataDto {
  @ApiProperty()
  @IsString()
  identity: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsObject()
  profileData: Map<string, any>;
}
