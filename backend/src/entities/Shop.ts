import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { ShopDay } from './ShopDay';

@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  phone: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  area: string;

  @Column({ type: 'varchar', nullable: true, default: 'Salon & Spa' })
  category: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @OneToOne(() => User, (user) => user.shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'varchar', name: 'working_hours_start', default: '09:00' })
  workingHoursStart: string;

  @Column({ type: 'varchar', name: 'working_hours_end', default: '19:00' })
  workingHoursEnd: string;

  @Column({ name: 'slot_duration_minutes', type: 'int', default: 30 })
  slotDurationMinutes: number;

  @OneToMany(() => ShopDay, (day) => day.shop)
  days: ShopDay[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
