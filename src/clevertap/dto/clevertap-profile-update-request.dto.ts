import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClevertapProfileUpdateDataDto } from './clevertap-profile-update-data.dto';

export class ClevertapProfileUpdateRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [ClevertapProfileUpdateDataDto] })
  @ArrayMinSize(1)
  @Type(() => ClevertapProfileUpdateDataDto)
  d: ClevertapProfileUpdateDataDto[];
}
