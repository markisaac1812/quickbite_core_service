import {env} from "../config/env"
import type {Knex} from "knex";

const config: Knex.Config = {
    client: 'pg',
    connection: {
        host: env.db.host,
        port: env.db.port,
        user: env.db.username,
        password: env.db.password,
        database: env.db.name
    },
    pool: {
        min: 2,
        max: env.db.poolMax
    },
    migrations: {
        directory: env.db.migrationsDirectory,
        extension: env.db.migrationsExtension,
        
    }
};

export default config;