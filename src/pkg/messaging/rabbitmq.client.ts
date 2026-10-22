import amqp from "amqp-connection-manager";
import type {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import type {ConfirmChannel} from "amqplib";
import type {IMessageBroker} from "./message-broker.interface";

export interface RabbitMQConfig {
    url: string;
    reconnectInitialMs?: number;
}

/**
 * Producer-side wrapper built on amqp-connection-manager. The library handles
 * auto-reconnect, channel re-creation, and buffering publishes while
 * disconnected. Confirm channel → publish() waits for the broker ACK.
 */
export class RabbitMQClient implements IMessageBroker {
    private connection: AmqpConnectionManager | null = null;
    private channel: ChannelWrapper | null = null;

    constructor(private readonly config: RabbitMQConfig) {}

    async connect(): Promise<void> {
        if (this.connection) return;
        this.connection = amqp.connect([this.config.url], {
            reconnectTimeInSeconds: Math.max(1, Math.round((this.config.reconnectInitialMs ?? 500) / 1000)),
        });
        this.channel = this.connection.createChannel({json: false});
        await this.channel.waitForConnect();
    }

    async close(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
        } catch {}
        try {
            if (this.connection) await this.connection.close();
        } catch {}
        this.channel = null;
        this.connection = null;
    }

    async declareExchange(exchange: string): Promise<void> {
        if (!this.channel) await this.connect();
        await this.channel!.addSetup((ch: ConfirmChannel) =>
            ch.assertExchange(exchange, "topic", {durable: true}),
        );
    }

    async publishConfirmed(exchange: string, routingKey: string, body: Buffer): Promise<void> {
        if (!this.channel) await this.connect();
        await this.channel!.publish(exchange, routingKey, body, {
            persistent: true,
            contentType: "application/json",
        });
    }
}
