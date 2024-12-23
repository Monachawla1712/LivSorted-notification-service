import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user', schema: 'auth' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column('varchar', { length: 15, nullable: true })
  phone_number: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string;
  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_deleted: boolean;
}
