import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Shop } from './Shop';

export type UserRole = 'admin' | 'owner';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({
    type: 'varchar',
    default: 'owner',
  })
  role: UserRole;

  @Column({ nullable: true, type: 'uuid' })
  shopId: string | null;

  @OneToOne(() => Shop, (shop) => shop.owner, { nullable: true })
  shop?: Shop;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
