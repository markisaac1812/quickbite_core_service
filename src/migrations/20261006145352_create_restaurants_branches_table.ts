import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TYPE currency_enum AS ENUM('EGP','SAR');
        
        CREATE TABLE restaurant_branches (
            id BIGSERIAL PRIMARY KEY,
            restaurant_id BIGINT NOT NULL,
            country_code TEXT NOT NULL,
            address_text TEXT NOT NULL,
            label TEXT NOT NULL,
            lat DECIMAL(10, 7) NOT NULL,
            lng DECIMAL(10, 7) NOT NULL,
            is_active BOOLEAN NOT NULL,
            opens_at TIME NOT NULL,
            closes_at TIME NOT NULL,
            accept_orders BOOLEAN NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            delivery_radius SMALLINT NOT NULL,
            currency VARCHAR(255),
            commission INT NOT NULL,
            
            
            CONSTRAINT fk_restaurant_branches_restaurant_id FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );
        
        CREATE INDEX idx_restaurant_branches_restaurant_id ON restaurant_branches(restaurant_id);
        CREATE INDEX idx_restaurant_branches_is_active ON restaurant_branches(is_active);
        CREATE INDEX idx_restaurant_branches_at_long ON restaurant_branches(lat, lng);
        
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DROP TABLE IF EXISTS restaurant_branches;
    `)
}

