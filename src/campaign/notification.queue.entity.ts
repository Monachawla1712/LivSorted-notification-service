import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';
import { NotificationQueueMetadata } from './dto/notification.queue.metadata';
import { UploadBean } from '../core/common/sheet-upload/upload.bean';

@Entity({ name: 'notification_queue', schema: 'notification' })
export class NotificationQueueEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  campaign_id: string;

  @Column()
  user_id: string;

  @Column()
  is_processed: boolean;

  @Column({
    type: 'jsonb',
    array: false,
    default: () => "'{}'",
    nullable: true,
  })
  meta_data: NotificationQueueMetadata;

  @Column()
  is_active: boolean;

  public static createEntity(bean: UploadBean) {
    const queueEntity = new NotificationQueueEntity();
    queueEntity.campaign_id = bean.campaignId;
    queueEntity.user_id = bean.userId;
    queueEntity.is_processed = false;
    queueEntity.meta_data = new NotificationQueueMetadata();
    queueEntity.meta_data.fillers = bean.fillers;
    queueEntity.meta_data.userId = bean.userId;
    queueEntity.meta_data.campaignId = bean.campaignId;
    queueEntity.meta_data.validDays = bean.validDays;
    queueEntity.is_active = true;
    return queueEntity;
  }
}
