# Microservices Communication

When you split a monolith into services, function calls that used to happen inside one process become calls over a network. Networks are slow, unreliable, and can fail halfway. Almost everything in this topic is a way of dealing with that.

---

## Table of Contents

1. [Sync vs Async](#1-sync-vs-async)
2. [Methods and Common Patterns](#2-methods-and-common-patterns)
3. [Real Scenario: User, API Gateway, 3 Services](#3-real-scenario-user-api-gateway-3-services)
4. [API Gateway vs Load Balancer](#4-api-gateway-vs-load-balancer)
5. [SQS and SNS (AWS) and Non-AWS Equivalents](#5-sqs-and-sns-aws-and-non-aws-equivalents)
6. [Outbox Pattern](#6-outbox-pattern)
7. [Mental Model: How to Choose](#7-mental-model-how-to-choose)

---

## 1. Sync vs Async

**Synchronous** is like a phone call. Service A sends a request and **waits** for the response before continuing. Both services must be up at the same moment.

**Asynchronous** is like a text message or email. Service A sends a message (usually to a broker) and **moves on without waiting**. B processes it whenever it can, even if B was down when A sent it.

| | Sync | Async |
|---|---|---|
| Caller waits? | Yes | No |
| Coupling | Tight (A needs B alive right now) | Loose (A only needs the broker) |
| Failure behavior | Cascades | Absorbed by the queue |
| Consistency | Immediate | Eventual |
| Simplicity | Easy to reason about and debug | Harder to trace |

---

## 2. Methods and Common Patterns

### Sync methods

- **REST over HTTP**: the most common; URLs and verbs, usually JSON.
- **gRPC**: binary (Protobuf) and fast; common for internal service-to-service calls.
- **GraphQL**: usually used at the edge, between clients and the backend.

### Sync patterns

| Pattern | What it does |
|---|---|
| **API Gateway** | Single entry point; handles auth, routing, rate limiting |
| **Service discovery + load balancing** | How A finds a healthy instance of B |
| **Timeouts and retries with backoff** | Never wait forever; retry sensibly |
| **Circuit breaker** | After repeated failures, stop calling B for a while and fail fast |
| **Bulkhead** | Isolate resources so one slow dependency can't use up all threads |
| **API composition / BFF** | One service calls several others and merges results for the client |

### Async methods

- **Message queue (point-to-point):** one message goes to one consumer; used for work distribution.
- **Pub/Sub (topics):** one message goes to many subscribers.
- **Event streaming:** a durable, replayable log of events (Kafka).

### Async patterns

| Pattern | What it does |
|---|---|
| **Event-driven / event notification** | "OrderPlaced happened"; whoever cares reacts |
| **Competing consumers** | Multiple workers pull from one queue to scale |
| **Fan-out** | One event delivered to many queues |
| **Saga** | A multi-service business transaction made of local steps, with compensating actions on failure (e.g. refund the payment if shipping fails) |
| **Dead-letter queue (DLQ)** | Where messages that keep failing end up |
| **Idempotent consumer** | Safely handle the same message more than once |
| **Outbox** | Reliably publish events after a DB write (see section 6) |

---

## 3. Real Scenario: User, API Gateway, 3 Services

Setup: a **User**, an **API Gateway**, and three services: **Order**, **Payment**, and **Notification**. The user clicks "Place order."

### Fully sync version

```
User → Gateway → Order → Payment → (done) → Notification → (done) → back to user
```

Problems you will run into:

1. **Latency adds up.** The user waits for Order + Payment + Notification time combined.
2. **Availability multiplies.** If each service is 99.9% available, a chain of three is about 99.7%, and it only gets worse as the chain grows.
3. **Cascading failure.** If Notification is slow, Order threads pile up waiting, then the gateway backs up, and soon the whole system is down because of an email service.
4. **Partial failure.** Payment succeeds, but the response times out. Did the user get charged? Order doesn't know. If it retries, the user may be **double charged**. The fix is **idempotency keys**: the client sends a unique ID and Payment ignores repeats.
5. **Tight coupling.** Order must know about Notification. Adding a new Analytics service means editing Order.

### Better hybrid design

```
User → Gateway → Order → Payment      (sync: user needs the result now)
                   │
                   └─ publishes "OrderPlaced" ─→ Broker ─→ Notification
                                                       ├─→ Inventory
                                                       └─→ Analytics
```

- **Payment stays sync** because the user needs an immediate answer and the money has to be right.
- **Everything else is async** because it doesn't need to block the user.
- Adding Analytics later means subscribing to the event, with **no change to Order**.

### New problems async introduces

- **Eventual consistency:** the order exists, but the email hasn't gone out yet.
- **Duplicate delivery:** most brokers guarantee *at-least-once*, so consumers must be idempotent.
- **Ordering:** "OrderCancelled" might arrive before "OrderPlaced."
- **Poison messages:** one bad message fails forever, so you need retries plus a DLQ.
- **Debugging:** a request spans many services, so you need correlation IDs and distributed tracing.
- **The dual-write problem:** solved by the outbox pattern (section 6).

---

## 4. API Gateway vs Load Balancer

- A **load balancer** spreads traffic across instances of the *same* service.
- An **API gateway** sits at the edge and *understands your API*: it authenticates, routes `/orders` to Order, `/payments` to Payment, and rate-limits.
- You often have both: the gateway in front, with load balancers (or service discovery) behind it.

---

## 5. SQS and SNS (AWS) and Non-AWS Equivalents

Both are **async**, and they map to the two core async models:

- **SQS (Simple Queue Service):** a queue. Point-to-point; consumers **pull** messages, and messages are deleted after processing.
- **SNS (Simple Notification Service):** pub/sub. You publish once and it **pushes** to all subscribers.
- **SNS → SQS fan-out** is the classic combination. SNS broadcasts, and each service has its own SQS queue so it can process at its own pace, with retries and a DLQ.

AWS also has:

- **EventBridge:** an event bus with routing rules.
- **Kinesis:** streaming, similar to Kafka.

### Non-AWS equivalents

| AWS | General-purpose equivalent |
|---|---|
| SQS | **RabbitMQ**, ActiveMQ, Azure Service Bus queues, Google Cloud Tasks |
| SNS | RabbitMQ exchanges (fanout/topic), Google Pub/Sub, Azure Service Bus topics, NATS |
| Kinesis | **Apache Kafka**, Redpanda |
| EventBridge | Kafka plus routing logic, Azure Event Grid |

### The two to learn first

- **RabbitMQ:** a smart broker with flexible routing. Great for task queues and traditional messaging; messages are removed once consumed.
- **Kafka:** a distributed, durable log. Events are retained and can be replayed, and it handles huge throughput. It fits event streaming and event sourcing.

---

## 6. Outbox Pattern

### The problem: dual write

When an order is placed, Order Service must do **two things**:

1. Save the order in its database.
2. Publish `OrderPlaced` to the broker.

These are two different systems, so you **can't make them atomic**.

- If you save the order and the publish fails, the order exists but nobody ever hears about it.
- If you publish and the DB save fails, you've announced an order that doesn't exist.

### The solution

Write the event into an **`outbox` table in the same database transaction** as the business data. A database transaction is atomic, so either both are saved or neither is.

```sql
BEGIN;
  INSERT INTO orders (id, user_id, total) VALUES (42, 7, 99.00);
  INSERT INTO outbox (id, type, payload, published)
    VALUES (gen_random_uuid(), 'OrderPlaced', '{"orderId":42}', false);
COMMIT;
```

### The relay process

A separate **relay** reads unpublished rows from the outbox, publishes them to the broker, and marks them as sent.

```
1. Order Service  → saves order + outbox row in one DB transaction (then responds to the user)
2. Relay          → reads the outbox row from the DB
3. Relay          → publishes OrderPlaced to the broker
4. Relay          → marks the row as published
```

**The relay is the main publisher, not a supervisor.**

- Order Service **never talks to the broker**. For it, "telling the queue" just means writing a row to the outbox table.
- The relay publishes **every** event, not only the ones that failed. "Unpublished" simply means "not yet sent"; a brand new event is unpublished for a few milliseconds until the relay picks it up.
- The relay is logically part of the Order Service. It is not a third party.

**Why not publish directly and use the relay only as a backup?** Then you'd have two publishers and the original problems return: more duplicates, more ordering confusion, and two code paths to test. With a single publisher the rule is simple: **if it's in the outbox, it will be published.** The outbox table is the source of truth for "events that must go out." (Some teams do use the hybrid of direct publish plus relay safety net to reduce latency, but that is an optimization, not the canonical pattern.)

### Ways to build the relay

1. **Polling publisher:** a background job (a thread or scheduled job inside the Order Service app, or a small separate process) queries the outbox table every few hundred ms. Simple.
2. **CDC (change data capture):** a tool like **Debezium** tails the database's transaction log and streams outbox inserts to Kafka. More scalable, doesn't burden the database with polling, and you write no relay code.

Polling adds maybe tens to hundreds of milliseconds of latency; CDC is near real-time. Since this is already async work, the user isn't waiting on it.

### Delivery guarantees

The relay can crash **after publishing but before marking the row**, so it may publish the same event twice. That means the pattern gives you **at-least-once delivery**, and consumers still need to be **idempotent**.

The matching consumer-side technique is an **inbox table** that stores processed message IDs so duplicates are skipped.

### What the outbox solves, in one line

It turns "save the order **and** publish the event" (which can't be atomic across two systems) into "save the order **and** the event row together" (which can), and lets the relay handle the unreliable broker part with as many retries as needed.

---

## 7. Mental Model: How to Choose

When designing communication between two services, ask:

1. **Does the caller need the answer right now to continue?** If yes, use sync (REST or gRPC). If no, use async.
2. **What happens if the other service is down?** If the answer is "we lose business," decouple with a queue.
3. **Who needs to know?** One consumer means a queue. Many consumers, or consumers you don't know about yet, means pub/sub.
4. **What happens on duplicates, failures, and ordering?** Design for idempotency, retries, DLQs, and timeouts from the start.
5. **Do I need to update my DB and tell others?** Use the outbox.

**Rule of thumb:** sync for queries and for commands that need immediate confirmation; async for reactions and side effects.

---
