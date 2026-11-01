import amqplib from "amqplib";
import {env} from "../../src/lib/config/env";

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection["createChannel"]>>;

export interface ReceivedMessage {
    routingKey: string;
    contentType: string | undefined;
    persistent: boolean;
    body: any;
}

/**
 * Side-channel to the real RabbitMQ broker for arranging / asserting broker
 * state (catch published events). The code under test still uses its own
 * RabbitMQClient.
 */
export class AmqpProbe {
    private constructor(private readonly conn: AmqpConnection) {}

    static async open(): Promise<AmqpProbe> {
        const conn = await amqplib.connect(env.rabbit.url);
        conn.on("error", () => {}); // a broker-closed connection must not crash the test process
        return new AmqpProbe(conn);
    }

    /**
     * Durable topic exchange + a queue bound to it with `#`. The queue is
     * exclusive to this probe's connection and vanishes when the probe closes.
     */
    async bindCatchAllQueue(exchange: string, queue: string): Promise<string> {
        await this.withChannel(async (ch) => {
            await ch.assertExchange(exchange, "topic", {durable: true});
            await ch.assertQueue(queue, {exclusive: true, durable: false});
            await ch.purgeQueue(queue);
            await ch.bindQueue(queue, exchange, "#");
        });
        return queue;
    }

    async purge(queue: string): Promise<void> {
        await this.withChannel(async (ch) => {
            await ch.purgeQueue(queue);
        });
    }

    /** Pops one message (auto-ack), or null when the queue is empty. */
    async pop(queue: string): Promise<ReceivedMessage | null> {
        let out: ReceivedMessage | null = null;
        await this.withChannel(async (ch) => {
            const msg = await ch.get(queue, {noAck: true});
            if (msg) {
                out = {
                    routingKey: msg.fields.routingKey,
                    contentType: msg.properties.contentType,
                    persistent: msg.properties.deliveryMode === 2,
                    body: JSON.parse(msg.content.toString("utf8")),
                };
            }
        });
        return out;
    }

    async close(): Promise<void> {
        await this.conn.close();
    }

    // A broker-side error (e.g. 404 on a missing queue) closes the channel, so
    // every probe operation gets its own short-lived channel.
    private async withChannel(fn: (ch: AmqpChannel) => Promise<void>): Promise<void> {
        const ch = await this.conn.createChannel();
        ch.on("error", () => {});
        try {
            await fn(ch);
        } finally {
            await ch.close().catch(() => {});
        }
    }
}
