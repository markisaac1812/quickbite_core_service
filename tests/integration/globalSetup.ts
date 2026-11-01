// MUST stay the first import. Imports are hoisted above any other statement,
// so a `config()` call further down would run only after env.ts/knex had
// already read the dev `.env` — and migrate the wrong database.
import "../setup-env";
import {db} from "../../src/lib/knex/knex";
import {env} from "../../src/lib/config/env";
import {assertTestDatabase} from "../helpers/db";

export default async function globalSetup() {
    assertTestDatabase(env.db.name);
    await db.migrate.latest();
    console.log(`Global setup for integration tests completed (db: ${env.db.name}).`);
}
