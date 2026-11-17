import "reflect-metadata";
import http from "http";
import { createApp } from "./app";
import { env } from "./lib/config/env";
import {db} from "./lib/knex/knex";
import {logger} from "./lib/logger/logger";

const app = createApp();
const port = env.port
const server = http.createServer(app);

server.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});

// How long in-flight requests get to finish before the process is forced out.
// ECS sends SIGKILL 30s after SIGTERM by default, so this must stay below that.
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal: string){
    logger.info("shutdown requested", {signal});
    server.close(async () => {
        logger.info("Server closed");
        try {
            await db.destroy();
            logger.info("Database connection closed");
        } catch (err) {
            logger.error("Failed to close database connection", {error: (err as Error).message});
        }
        process.exit(0);
    });
    // server.close() waits for every open connection, and idle keep-alive
    // sockets (load balancer, browsers) can hold it open indefinitely.
    setTimeout(() => {
        logger.error("Shutdown timed out, forcing exit");
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
