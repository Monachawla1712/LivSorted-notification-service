import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';
import { TemplateEntity } from '../template/template.entity';
import { NotificationStatus } from '../core/enums/notification.status';
import { NotificationChannel } from '../core/enums/notification.channel';
import { LogMetadata } from './log_metadata';

@Entity({ name: 'log', schema: 'notification' })
export class LogEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  user_id: string;

  @Column()
  user_identity: string;

  @Column()
  template_name: string;

  @Column('uuid')
  campaign_id: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  body: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
  })
  status: NotificationStatus;

  @Column('uuid', {})
  template_id: string;

  @ManyToOne(() => TemplateEntity)
  @JoinColumn({ name: 'template_id', referencedColumnName: 'id' })
  template: TemplateEntity;

  @Column('jsonb', { name: 'metadata', array: false, nullable: true })
  metadata: LogMetadata = new LogMetadata();

  @Column({ nullable: true })
  expiry: Date;
}
