import {env} from "../config/env"
import type {Knex} from "knex";

const config: Knex.Config = {
    client: 'pg',
    connection: {
        host: env.db.host,
        port: env.db.port,
        user: env.db.username,
        password: env.db.password,
        database: env.db.name,
        // RDS requires TLS. Its certificate is signed by the AWS RDS CA, which is
        // not in Node's trust store, so the chain is not verified (traffic stays
        // encrypted inside the VPC).
        ssl: env.db.ssl ? {rejectUnauthorized: false} : false,
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