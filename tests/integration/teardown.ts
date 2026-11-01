// MUST stay the first import — see globalSetup.ts.
import "../setup-env";
import {db} from "../../src/lib/knex/knex";

export default async function globalTeardown() {
    await db.destroy();
}
