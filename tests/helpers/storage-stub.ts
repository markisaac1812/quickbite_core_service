import {IStorageProvider, PresignedUpload, PresignedUploadInput, StoredObjectInfo} from "../../src/pkg/storage/storage.interface";

/**
 * In-memory stand-in for S3 — HTTP tests swap `lib/storage/init` for this
 * (same pattern as EmailStub). `simulateClientPut` plays the frontend's direct
 * PUT to the presigned URL. S3StorageProvider itself is exercised against the
 * real bucket manually (it needs AWS credentials).
 */
export class StorageStub implements IStorageProvider {
  objects = new Map<string, StoredObjectInfo>();
  presigned: PresignedUploadInput[] = [];
  deleted: string[] = [];

  async createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload> {
    this.presigned.push(input);
    return {
      uploadUrl: `https://test-bucket.example.com/${input.key}?X-Amz-Signature=stub`,
      headers: {"Content-Type": input.contentType},
      key: input.key,
      publicUrl: this.getPublicUrl(input.key),
      expiresIn: input.expiresInSeconds,
    };
  }
  async getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
    return this.objects.get(key) ?? null;
  }
  async deleteObject(key: string): Promise<void> {
    this.deleted.push(key);
    this.objects.delete(key);
  }
  getPublicUrl(key: string): string {
    return `https://test-bucket.example.com/${key}`;
  }

  simulateClientPut(key: string, info: StoredObjectInfo): void {
    this.objects.set(key, info);
  }
  reset(): void {
    this.objects.clear();
    this.presigned = [];
    this.deleted = [];
  }
}

export const storageStub = new StorageStub();
