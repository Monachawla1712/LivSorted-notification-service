import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'role_privileges', schema: 'notification' })
export class RolePrivilegesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role_id: number;

  @Column('varchar', { length: 100 })
  privilege_slug: string;

  @Column({ default: 1 })
  active: number;

  @CreateDateColumn()
  created_at: Date;

  @Column('uuid', { nullable: true })
  created_by: string;

  @UpdateDateColumn()
  modified_at: Date;

  @Column('uuid', { nullable: true })
  modified_by: string;
}
