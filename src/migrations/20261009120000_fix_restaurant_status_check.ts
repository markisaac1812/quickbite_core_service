import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE restaurants
        DROP CONSTRAINT IF EXISTS restaurants_status_check;

        ALTER TABLE restaurants
        ADD CONSTRAINT restaurants_status_check
        CHECK (status IN ('active', 'suspended', 'disabled', 'pending'));
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE restaurants
        DROP CONSTRAINT IF EXISTS restaurants_status_check;

        ALTER TABLE restaurants
        ADD CONSTRAINT restaurants_status_check
        CHECK (status IN ('active', 'suspended', 'disbaled', 'pending'));
    `);
}