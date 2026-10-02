import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shop } from './Shop';

export type SlotStatus = 'available' | 'booked' | 'closed';

export interface SlotItem {
  id: string;
  start: string; // e.g. "09:00"
  end: string;   // e.g. "09:30"
  status: SlotStatus;
  customerName?: string;
}

@Entity('shop_days')
@Index(['shopId', 'date'], { unique: true })
export class ShopDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, (shop) => shop.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ type: 'varchar', length: 10 })
  date: string; // YYYY-MM-DD format

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  slots: SlotItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
