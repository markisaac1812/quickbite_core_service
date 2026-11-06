import path from "path";
import {config} from "dotenv";
import {z} from "zod";

config({path: path.resolve(__dirname, "../../../.env")}); // loadsvalues from .env file into process.env

const schema = z.object({
    PORT: z.string().default("3000"),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.string().default("5432"),
    DB_USER: z.string().default("postgres"),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    DB_POOL_MAX: z.string().default("10"),
    DB_MIGRATIONS_DIRECTORY: z.string(),
    DB_MIGRATIONS_EXTENSION: z.string(),
    ACCESS_SECRET: z.string(),
    REFRESH_SECRET: z.string(),
    ACCESS_EXPIRES_IN: z.string().default("900"), // 15 minutes
    REFRESH_EXPIRES_IN: z.string().default("604800"), // 7 days
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.string().default("6379"),
    REDIS_PASSWORD: z.string().default(""),
    MAILJET_API_KEY: z.string(),
    MAILJET_API_SECRET: z.string(),
    MAILJET_FROM_EMAIL: z.string(),
    MAILJET_FROM_NAME: z.string(),
    INTERNAL_API_KEY: z.string().default(""),
    // RabbitMQ — used by the outbox worker.
    RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
    RABBITMQ_CORE_EVENTS_EXCHANGE: z.string().default("core.events"),
    // Cron expression for the outbox drain schedule. 6-field form; "* * * * * *" = every second.
    OUTBOX_DRAIN_CRON: z.string().default("* * * * * *"),
    OUTBOX_BATCH_SIZE: z.string().default("50"),
    // AWS / S3 — media uploads.
    AWS_REGION: z.string().default("eu-north-1"),
    AWS_S3_BUCKET: z.string(),
    // Folder (key prefix) inside the bucket that uploads go under.
    AWS_S3_PREFIX: z.string().default("restaurants"),
    // Leave empty to use the SDK default credential chain (e.g. an IAM role in prod).
    AWS_ACCESS_KEY_ID: z.string().default(""),
    AWS_SECRET_ACCESS_KEY: z.string().default(""),
    // CDN (e.g. CloudFront) in front of the bucket. When set, stored media URLs use
    // this domain instead of the raw S3 one. Empty = public S3 URLs.
    AWS_CDN_URL: z.string().default(""),
    MEDIA_MAX_FILE_SIZE_MB: z.string().default("5"),
    // How long a presigned upload URL stays valid.
    MEDIA_UPLOAD_URL_EXPIRES_IN: z.string().default("300"),
});

const parsed = schema.parse(process.env); 

export const env = {
    port: Number(parsed.PORT),
    db: {
        host: parsed.DB_HOST,
        port: Number(parsed.DB_PORT),
        username: parsed.DB_USER,
        password: parsed.DB_PASSWORD,
        name: parsed.DB_NAME,
        poolMax: Number(parsed.DB_POOL_MAX),
        migrationsDirectory: path.resolve(__dirname, "../../../", parsed.DB_MIGRATIONS_DIRECTORY),
        migrationsExtension: parsed.DB_MIGRATIONS_EXTENSION
    },
    jwt:{
        accessSecret: parsed.ACCESS_SECRET,
        refreshSecret: parsed.REFRESH_SECRET,
        accessExpiresIn: Number(parsed.ACCESS_EXPIRES_IN),
        refreshExpiresIn: Number(parsed.REFRESH_EXPIRES_IN)
    },
    isProduction: process.env.NODE_ENV === "production",
    cors:{
        origins: parsed.CORS_ORIGIN.split(",")
    },
    redis: {
        host: parsed.REDIS_HOST,
        port: Number(parsed.REDIS_PORT),
        password: parsed.REDIS_PASSWORD
    },
    mailjet: {
        apiKey: parsed.MAILJET_API_KEY,
        secretKey: parsed.MAILJET_API_SECRET,
        fromEmail: parsed.MAILJET_FROM_EMAIL,
        fromName: parsed.MAILJET_FROM_NAME
    },
    internal: {
        apiKey: parsed.INTERNAL_API_KEY,
    },
    rabbit: {
        url: parsed.RABBITMQ_URL,
        exchange: parsed.RABBITMQ_CORE_EVENTS_EXCHANGE,
        drainCron: parsed.OUTBOX_DRAIN_CRON,
        batchSize: Number(parsed.OUTBOX_BATCH_SIZE),
    },
    aws: {
        region: parsed.AWS_REGION,
        s3Bucket: parsed.AWS_S3_BUCKET,
        s3Prefix: parsed.AWS_S3_PREFIX.replace(/^\/+|\/+$/g, ""),
        accessKeyId: parsed.AWS_ACCESS_KEY_ID,
        secretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
        cdnUrl: normalizeBaseUrl(parsed.AWS_CDN_URL),
    },
    media: {
        maxFileSizeBytes: Number(parsed.MEDIA_MAX_FILE_SIZE_MB) * 1024 * 1024,
        uploadUrlExpiresIn: Number(parsed.MEDIA_UPLOAD_URL_EXPIRES_IN),
    },
}

/** "cdn.example.com/" or "https://cdn.example.com" -> "https://cdn.example.com"; "" stays "". */
function normalizeBaseUrl(value: string): string {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
