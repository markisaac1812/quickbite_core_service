import {WaitForOptions} from "./types";

/**
 * Polls `check` until it returns true. For effects that land asynchronously
 * (RabbitMQ deliveries, fire-and-forget cache writes).
 */
export async function waitFor(check: () => Promise<boolean> | boolean, options: WaitForOptions = {}): Promise<void> {
    const {timeoutMs = 5000, intervalMs = 25} = options;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
}
