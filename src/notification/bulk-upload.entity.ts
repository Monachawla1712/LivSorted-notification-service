import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export class BulkUploadData {
  data: object[];
}
@Entity('bulk_upload', { schema: 'notification' })
export class BulkUploadEntity {
  constructor(data: object[], module: string, userId: string) {
    this.jsonData = new BulkUploadData();
    this.jsonData.data = data;
    this.module = module;
    this.accessKey = uuidv4();
    this.status = null;
    this.createdBy = userId;
    this.modifiedBy = userId;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'access_key', length: 50 })
  accessKey: string;

  @Column({ name: 'module', length: 50, nullable: true })
  module: string;

  @Column({ name: 'json_data', type: 'jsonb' })
  jsonData: BulkUploadData;

  @Column({ name: 'status', nullable: true })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  @Column({ name: 'modified_by' })
  modifiedBy: string;
}
