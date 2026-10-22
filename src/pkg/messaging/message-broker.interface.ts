export interface IMessageBroker {
    connect(): Promise<void>;
    close(): Promise<void>;
    declareExchange(exchange: string): Promise<void>;
    /**
     * Publishes a message with publisher confirms. Resolves only when the
     * broker has acked. Rejects on nack or connection loss.
     */
    publishConfirmed(exchange: string, routingKey: string, body: Buffer): Promise<void>;
}
