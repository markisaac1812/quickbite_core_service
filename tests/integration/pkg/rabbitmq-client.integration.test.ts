import {randomUUID} from "crypto";
import {AmqpProbe} from "../../helpers/amqp";
import {waitFor} from "../../helpers/wait";
import {env} from "../../../src/lib/config/env";
import {RabbitMQClient} from "../../../src/pkg/messaging/rabbitmq.client";

const EXCHANGE = "core-services.client.test";

describe("RabbitMQClient (real RabbitMQ)", () => {
    let probe: AmqpProbe;
    let queue: string;
    let client: RabbitMQClient;

    beforeAll(async () => {
        probe = await AmqpProbe.open();
        queue = await probe.bindCatchAllQueue(EXCHANGE, `core-services.client-probe.${randomUUID()}`);
    });

    afterAll(async () => {
        await probe.close();
    });

    beforeEach(async () => {
        await probe.purge(queue);
        client = new RabbitMQClient({url: env.rabbit.url, reconnectInitialMs: 1000});
    });

    afterEach(async () => {
        await client.close();
    });

    it("connects lazily on first use, declares the exchange and publishes with a broker ack", async () => {
        // Arrange
        await client.declareExchange(EXCHANGE);

        // Act
        await client.publishConfirmed(EXCHANGE, "product.stock.changed", Buffer.from(JSON.stringify({productId: 1}), "utf8"));

        // Assert
        let msg: Awaited<ReturnType<AmqpProbe["pop"]>> = null;
        await waitFor(async () => (msg = await probe.pop(queue)) !== null);
        expect(msg).toEqual({routingKey: "product.stock.changed", contentType: "application/json", persistent: true, body: {productId: 1}});
    });

    it("treats a second connect as a no-op", async () => {
        // Arrange
        await client.connect();

        // Act
        const again = client.connect();

        // Assert
        await expect(again).resolves.toBeUndefined();
    });

    it("reconnects after close when asked to publish again", async () => {
        // Arrange
        await client.connect();
        await client.close();

        // Act
        await client.publishConfirmed(EXCHANGE, "branch.updated", Buffer.from("{}", "utf8"));

        // Assert
        let msg: Awaited<ReturnType<AmqpProbe["pop"]>> = null;
        await waitFor(async () => (msg = await probe.pop(queue)) !== null);
        expect(msg!.routingKey).toBe("branch.updated");
    });

    it("closes safely when it never connected, and twice in a row", async () => {
        // Arrange
        const fresh = new RabbitMQClient({url: env.rabbit.url});

        // Act
        const closes = [await fresh.close(), await fresh.close()];

        // Assert
        expect(closes).toEqual([undefined, undefined]);
    });
});
