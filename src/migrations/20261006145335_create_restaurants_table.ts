import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TABLE restaurants (
            id BIGSERIAL PRIMARY KEY,
            owner_id BIGINT NOT NULL,
            name TEXT NOT NULL,
            logo_url TEXT NOT NULL,
            status TEXT NOT NULL check (status IN ('active','suspended','disbaled','pending')),
            primary_country TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            status_updated_at TIMESTAMP NOT NULL,

            CONSTRAINT fk_restaurant_owner_id FOREIGN KEY (owner_id) REFERENCES users(id)
        );

        CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);
        CREATE INDEX idx_restaurants_status ON restaurants(status);
        CREATE INDEX idx_restaurants_primary_country ON restaurants(primary_country);
        CREATE INDEX idx_restaurants_created_at ON restaurants(created_at);
    `);

}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DROP TABLE IF EXISTS restaurants;
    `);
}

