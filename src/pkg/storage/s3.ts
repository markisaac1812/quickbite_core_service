import {DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, S3ServiceException} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {IStorageProvider, PresignedUpload, PresignedUploadInput, StoredObjectInfo} from "./storage.interface";

interface S3Config {
    region: string;
    bucket: string;
    // Optional: when omitted the SDK falls back to its default credential
    // chain (env vars, shared config, IAM role on EC2/ECS).
    accessKeyId?: string;
    secretAccessKey?: string;
}

export class S3StorageProvider implements IStorageProvider {
    private client: S3Client;
    private bucket: string;
    private region: string;

    constructor(config: S3Config) {
        this.bucket = config.bucket;
        this.region = config.region;
        this.client = new S3Client({
            region: config.region,
            credentials: config.accessKeyId && config.secretAccessKey
                ? {accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey}
                : undefined,
            // Otherwise the SDK signs a CRC32 of the (empty) presign-time body
            // into upload URLs; the client's real file never matches it.
            requestChecksumCalculation: "WHEN_REQUIRED",
        });
    }

    async createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: input.key,
            ContentType: input.contentType,
            ContentLength: input.contentLength,
        });
        const uploadUrl = await getSignedUrl(this.client, command, {
            expiresIn: input.expiresInSeconds,
            // Sign these as real headers (not query params) so S3 rejects a PUT
            // whose type or size differs from what the backend approved.
            signableHeaders: new Set(["content-type", "content-length"]),
        });
        return {
            uploadUrl,
            headers: {"Content-Type": input.contentType},
            key: input.key,
            publicUrl: this.getPublicUrl(input.key),
            expiresIn: input.expiresInSeconds,
        };
    }

    async getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
        try {
            const res = await this.client.send(new HeadObjectCommand({Bucket: this.bucket, Key: key}));
            return {contentType: res.ContentType, contentLength: res.ContentLength ?? 0};
        } catch (err) {
            if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404) {
                return null;
            }
            throw err;
        }
    }

    async deleteObject(key: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({Bucket: this.bucket, Key: key}));
    }

    getPublicUrl(key: string): string {
        const encodedKey = key.split("/").map(encodeURIComponent).join("/");
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
    }
}
