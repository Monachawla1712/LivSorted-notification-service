import { ClevertapEventDataDto } from './clevertap-event-data.dto';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ClevertapEventRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [ClevertapEventDataDto] })
  @ArrayMinSize(1)
  @Type(() => ClevertapEventDataDto)
  d: ClevertapEventDataDto[];
}
