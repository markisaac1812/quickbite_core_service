import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("password_resets", (table) => {
        table.renameColumn("otp_hased", "otp_hashed");
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("password_resets", (table) => {
        table.renameColumn("otp_hashed", "otp_hased");
    });
}
