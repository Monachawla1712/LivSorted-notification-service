import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'privilege_endpoints', schema: 'notification' })
export class PrivilegeEndpointsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50 })
  method: string;

  @Column('varchar', { length: 500 })
  uri: string;

  @Column('varchar', { length: 20 })
  uri_mode: string;

  @Column('varchar', { length: 100, nullable: true })
  privilege_slug: string;
}
