import http from "http";
import { createApp } from "./app";
import { env } from "./common/config/env";
import {db} from "./common/knex/knex";

const app = createApp();
const port = env.port
const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

async function shutdown(){
    server.close(async () => {
        console.log('Server closed');
        await db.destroy();
        console.log('Database connection closed');
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
