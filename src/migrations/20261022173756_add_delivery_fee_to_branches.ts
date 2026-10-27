import type {Knex} from "knex";

/**
 * Flat per-branch delivery fee in minor units of the branch currency.
 * Reads by order-service at checkout via the internal /branches/:id endpoint.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE restaurant_branches
        ADD COLUMN delivery_fee INT NOT NULL DEFAULT 0;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`ALTER TABLE restaurant_branches DROP COLUMN delivery_fee;`);
}
