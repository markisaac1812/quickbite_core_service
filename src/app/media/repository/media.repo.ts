import {db} from "../../../lib/knex/knex";
import {Media} from "../entity/media.entity";
import {MediaStatus} from "../entity/enums";

const MEDIA_COLS = ["id", "restaurant_id", "uploaded_by", "status", "key", "url", "mime_type", "size_bytes", "created_at"];

function toEntity(row: any): Media {
    return new Media({
        id: Number(row.id),
        restaurantId: Number(row.restaurant_id),
        uploadedBy: Number(row.uploaded_by),
        status: row.status,
        key: row.key,
        url: row.url,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
    });
}

export async function createMedia(data: Partial<Media>): Promise<Media> {
    const [row] = await db("media").insert({
        restaurant_id: data.restaurantId,
        uploaded_by: data.uploadedBy,
        status: data.status ?? MediaStatus.PENDING,
        key: data.key,
        url: data.url,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        created_at: new Date(),
    }).returning(MEDIA_COLS);
    return toEntity(row);
}

export async function findMediaById(id: number): Promise<Media | undefined> {
    const row = await db("media").select(MEDIA_COLS).where("id", id).first();
    return row ? toEntity(row) : undefined;
}

export async function updateMediaStatus(id: number, status: MediaStatus): Promise<Media> {
    const [row] = await db("media").where("id", id).update({status}).returning(MEDIA_COLS);
    return toEntity(row);
}
