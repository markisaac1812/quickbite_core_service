import {config} from "dotenv";
import path from "path";
import {db} from "../../src/lib/knex/knex";
config({path: path.resolve(__dirname, "../../.env.test")});

export default async function globalSetup() {
    await db.migrate.latest()
  // Perform any global setup tasks here, such as initializing databases or services
  console.log("Global setup for integration tests completed.");
}