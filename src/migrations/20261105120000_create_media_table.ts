import type {Knex} from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TABLE media (
            id              BIGSERIAL PRIMARY KEY,
            restaurant_id   BIGINT NOT NULL,
            uploaded_by     BIGINT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'pending',
            key             TEXT NOT NULL,
            url             TEXT NOT NULL,
            mime_type       TEXT NOT NULL,
            size_bytes      INT NOT NULL,
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_media_restaurant_id FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            CONSTRAINT fk_media_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id),
            CONSTRAINT chk_media_status CHECK (status IN ('pending', 'uploaded', 'failed')),
            CONSTRAINT uq_media_key UNIQUE (key)
        );

        CREATE INDEX idx_media_restaurant_id ON media (restaurant_id);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`DROP TABLE IF EXISTS media;`);
}
