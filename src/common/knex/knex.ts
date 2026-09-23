import knex from "knex";
import config from "./knexfile";

export const db = knex(config);

export async function pingDB(){
    await db.raw('SELECT 1');

}


