import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';
import { ClevertapEventRequestDto } from './dto/clevertap-event-request.dto';
import { ClevertapEventResponseDto } from './dto/clevertap-response.dto';

@Entity({ name: 'clevertap_log', schema: 'notification' })
export class ClevertapEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('json')
  request: ClevertapEventRequestDto;

  @Column('json')
  response: ClevertapEventResponseDto;
}
