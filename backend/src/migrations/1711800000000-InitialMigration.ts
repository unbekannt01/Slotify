import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1711800000000 implements MigrationInterface {
  name = 'InitialMigration1711800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "email" character varying NOT NULL UNIQUE,
        "passwordHash" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'owner',
        "shopId" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shops" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "name" character varying NOT NULL,
        "phone" character varying DEFAULT '',
        "area" character varying DEFAULT '',
        "category" character varying DEFAULT 'Salon & Spa',
        "owner_id" uuid NOT NULL,
        "working_hours_start" character varying NOT NULL DEFAULT '09:00',
        "working_hours_end" character varying NOT NULL DEFAULT '19:00',
        "slot_duration_minutes" integer NOT NULL DEFAULT 30,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_shops_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shop_days" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "shop_id" uuid NOT NULL,
        "date" character varying(10) NOT NULL,
        "slots" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shop_date" UNIQUE ("shop_id", "date"),
        CONSTRAINT "FK_shop_days_shop" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "shop_days";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shops";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
