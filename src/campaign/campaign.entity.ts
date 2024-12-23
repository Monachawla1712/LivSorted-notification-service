import { CommonEntity } from '../core/common/common.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationChannel } from '../core/enums/notification.channel';
import { CreateCampaignDto } from './dto/create.campaign.dto';
import { CampaignMetadata } from './dto/campaign.metadata';
import { CampaignStatus } from '../core/enums/campaign.status';

@Entity({ name: 'campaigns', schema: 'notification' })
export class CampaignEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  template_id: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  notification_channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
  })
  status: CampaignStatus;

  @Column()
  schedule_time: Date;

  @Column()
  is_active: boolean;

  @Column()
  is_data_processed: boolean;

  @Column({
    type: 'jsonb',
    array: false,
    default: () => "'{}'",
    nullable: true,
  })
  meta_data: CampaignMetadata;

  @Column('uuid', { nullable: true })
  created_by: string;

  @Column('uuid', { nullable: true })
  updated_by: string;

  static createCampaignEntity(
    createCampaignDto: CreateCampaignDto,
    userId: string,
    url: string,
  ): CampaignEntity {
    const entity = new CampaignEntity();
    entity.name = createCampaignDto.name;
    entity.template_id = createCampaignDto.template_id;
    entity.notification_channel = createCampaignDto.notification_channel;
    entity.is_active = true;
    entity.meta_data = new CampaignMetadata();
    entity.meta_data.sheet_url = url;
    if (createCampaignDto.fillers) {
      entity.meta_data.fillers = JSON.parse(createCampaignDto.fillers);
    }
    if (createCampaignDto.pn_channel) {
      entity.meta_data.pn_channel = createCampaignDto.pn_channel;
    }
    if (
      createCampaignDto.notification_channel == NotificationChannel.PN &&
      createCampaignDto.is_silent_pn
    ) {
      entity.meta_data.is_silent_pn = createCampaignDto.is_silent_pn;
    }
    entity.status = this.determineCampaignStatus(createCampaignDto);
    entity.schedule_time = this.determineScheduleTime(createCampaignDto);
    entity.created_by = userId;
    entity.updated_by = userId;
    return entity;
  }

  private static determineCampaignStatus(
    createCampaignDto: CreateCampaignDto,
  ): CampaignStatus {
    if (createCampaignDto.status === CampaignStatus.SCHEDULED) {
      return CampaignStatus.SCHEDULED;
    } else if (createCampaignDto.status === CampaignStatus.DRAFT) {
      return CampaignStatus.DRAFT;
    } else if (createCampaignDto.status === CampaignStatus.SEND_NOW) {
      return CampaignStatus.IN_PROGRESS;
    }
    return CampaignStatus.DRAFT;
  }

  private static determineScheduleTime(
    createCampaignDto: CreateCampaignDto,
  ): Date {
    if (
      createCampaignDto.status === CampaignStatus.SCHEDULED ||
      createCampaignDto.status === CampaignStatus.DRAFT
    ) {
      return createCampaignDto.schedule_time;
    } else if (createCampaignDto.status === CampaignStatus.SEND_NOW) {
      return new Date();
    }
    return null;
  }
}
