import "reflect-metadata";
import {Cron} from "croner";
import {env} from "./lib/config/env";
import {logger} from "./lib/logger/logger";
import {db} from "./lib/knex/knex";
import {messageBroker} from "./lib/events/init";
import {drainOutbox} from "./lib/events/outbox-drain";

/**
 * Outbox worker — runs independently of the HTTP server.
 *
 * API instances write to `events_outbox` in the same trx as their domain
 * mutation. This worker process polls that table on a schedule and publishes
 * pending rows to RabbitMQ with publisher confirms. Scales horizontally: the
 * repository's `claimBatch` uses FOR UPDATE SKIP LOCKED so N workers can run
 * in parallel without duplicate publishes.
 */
async function main() {
    try {
        await messageBroker.connect();
        await messageBroker.declareExchange(env.rabbit.exchange);
        logger.info("worker: broker connected, exchange declared", {exchange: env.rabbit.exchange});
    } catch (err) {
        logger.warn("worker: broker not reachable at boot — will retry on every drain", {
            error: (err as Error)?.message ?? String(err),
        });
    }

    const pattern = env.rabbit.drainCron;
    const job = new Cron(pattern, {protect: true}, async () => {
        try {
            await drainOutbox();
        } catch (err) {
            logger.error("outbox drain error", {error: (err as Error).message});
        }
    });
    logger.info("worker: outbox drain scheduled", {pattern, batchSize: env.rabbit.batchSize});

    const shutdown = async () => {
        logger.info("worker: shutdown requested");
        job.stop();
        try {
            await messageBroker.close();
        } catch (err) {
            logger.warn("worker: broker close error", {error: (err as Error).message});
        }
        try {
            await db.destroy();
        } catch {}
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((err) => {
    logger.error("worker: fatal", {error: (err as Error).message, stack: (err as Error).stack});
    process.exit(1);
});