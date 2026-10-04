import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { User } from './entities/User';
import { Shop } from './entities/Shop';
import { ShopDay } from './entities/ShopDay';

dotenv.config();

export const AppDataSource = new DataSource(
  process.env.DATABASE_URL
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
        entities: [User, Shop, ShopDay],
        migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
        subscribers: [],
        ssl:
          process.env.DATABASE_URL.includes('railway.app') || process.env.DATABASE_URL.includes('sslmode=require')
            ? { rejectUnauthorized: false }
            : false,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'slotify',
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
        entities: [User, Shop, ShopDay],
        migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
        subscribers: [],
      }
);
