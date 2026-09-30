import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE password_resets
        ALTER COLUMN consumed_at DROP NOT NULL;
    `);
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE password_resets
        ALTER COLUMN consumed_at SET NOT NULL;
    `);
}

