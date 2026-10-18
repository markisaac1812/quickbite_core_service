type LogLevel = 'info' | 'error' | 'warn' | 'debug';

export class Logger {
    private static instance: Logger;

    constructor() {
        if(!Logger.instance) {
            Logger.instance = this;
        }
        return Logger.instance;
    }

    log(level: LogLevel, message: string, metadata: Record<string, unknown> = {}) {
        const logObject = {
            level: level,
            message: message,
            timestamp: Date.now(),
            ...metadata
        }
        // This could call datadog logger
        console.log(JSON.stringify(logObject));
    }

    info(message: string, metadata: Record<string, unknown> = {}) {
        this.log('info', message, metadata);
    }

    error(message: string, metadata: Record<string, unknown> = {}) {
        this.log('error', message, metadata);
    }

    warn(message: string, metadata: Record<string, unknown> = {}) {
        this.log('warn', message, metadata);
    }

    debug(message: string, metadata: Record<string, unknown> = {}) {
        this.log('debug', message, metadata);
    }
}

export const logger = new Logger();
