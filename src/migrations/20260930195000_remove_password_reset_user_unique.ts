import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE password_resets
        DROP CONSTRAINT IF EXISTS password_resets_user_id_key;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE password_resets
        ADD CONSTRAINT password_resets_user_id_key UNIQUE (user_id);
    `);
}
