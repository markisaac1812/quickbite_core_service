export interface PresignedUploadInput {
    /** Full object key inside the bucket, e.g. "restaurants/12/3f2c....png". */
    key: string;
    contentType: string;
    /** Exact size in bytes the client declared — signed into the URL, S3 rejects any other size. */
    contentLength: number;
    expiresInSeconds: number;
}

export interface PresignedUpload {
    /** URL the client PUTs the file to, directly to S3. */
    uploadUrl: string;
    /** Headers the client must send with the PUT (they are part of the signature). */
    headers: Record<string, string>;
    key: string;
    /** URL the object will be reachable at once uploaded. */
    publicUrl: string;
    expiresIn: number;
}

export interface StoredObjectInfo {
    contentType?: string;
    contentLength: number;
}

export interface IStorageProvider {
    createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload>;
    /** Metadata of an uploaded object, or null when nothing exists at `key`. */
    getObjectInfo(key: string): Promise<StoredObjectInfo | null>;
    deleteObject(key: string): Promise<void>;
    getPublicUrl(key: string): string;
}
