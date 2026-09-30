import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { User } from './entities/User';
import { Shop } from './entities/Shop';
import { ShopDay } from './entities/ShopDay';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'slotify',
  synchronize: process.env.NODE_ENV !== 'production', // sync in dev, migrations in prod
  logging: false,
  entities: [User, Shop, ShopDay],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  subscribers: [],
});
