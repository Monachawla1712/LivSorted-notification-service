import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';
import { NotificationChannel } from '../core/enums/notification.channel';
import { TemplateMetadata } from './template_metadata';

@Entity({ name: 'template', schema: 'notification' })
export class TemplateEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  body: string;

  @Column('jsonb', { name: 'metadata', array: false, nullable: true })
  metadata: TemplateMetadata = new TemplateMetadata();

  @Column({ nullable: true })
  entity_type: string;
}
