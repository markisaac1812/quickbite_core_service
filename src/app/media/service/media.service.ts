import {randomUUID} from "crypto";
import {inject, injectable} from "tsyringe";
import {TOKENS} from "../../../lib/di/tokens";
import {env} from "../../../lib/config/env";
import {logger} from "../../../lib/logger/logger";
import {UnAuthorisedError} from "../../../lib/auth/errors";
import type {IStorageProvider} from "../../../pkg/storage/storage.interface";
import {SystemRole} from "../../user/entity/enums";
import {findRestaurantById} from "../../restaurant/repository/restaurant.repository";
import {RestaurantNotFoundError} from "../../restaurant/errors";
import {createMedia, findMediaById, updateMediaStatus} from "../repository/media.repo";
import {MediaStatus} from "../entity/enums";
import {Media} from "../entity/media.entity";
import {CreateUploadUrlDTO} from "../dto/media.dto";
import {
    FileNotUploadedError,
    MediaNotFoundError,
    MediaUploadFailedError,
    RestaurantIdRequiredError,
    UploadMismatchError,
} from "../errors";
import {ALLOWED_IMAGE_TYPES, MediaActor, UploadUrlResult} from "../types";

@injectable()
export class MediaService {
    constructor(@inject(TOKENS.StorageProvider) private readonly storage: IStorageProvider) {}

    /**
     * Steps 1–2 of the direct-to-S3 flow: records a pending media row and
     * returns a short-lived presigned PUT URL. The file never touches this server.
     */
    createUploadUrl = async (actor: MediaActor, data: CreateUploadUrlDTO): Promise<UploadUrlResult> => {
        const restaurantId = resolveRestaurantId(actor, data.restaurantId);

        const restaurant = await findRestaurantById(restaurantId);
        if (!restaurant) {
            throw RestaurantNotFoundError;
        }

        const extension = ALLOWED_IMAGE_TYPES[data.contentType];
        const key = `${env.aws.s3Prefix}/${restaurantId}/${randomUUID()}.${extension}`;

        const presigned = await this.storage.createPresignedUpload({
            key,
            contentType: data.contentType,
            contentLength: data.size,
            expiresInSeconds: env.media.uploadUrlExpiresIn,
        });

        const media = await createMedia({
            restaurantId,
            uploadedBy: actor.userId,
            status: MediaStatus.PENDING,
            key,
            url: presigned.publicUrl,
            mimeType: data.contentType,
            sizeBytes: data.size,
        });

        return {
            mediaId: media.id,
            uploadUrl: presigned.uploadUrl,
            method: "PUT",
            headers: presigned.headers,
            key,
            url: presigned.publicUrl,
            expiresIn: presigned.expiresIn,
        };
    }

    /**
     * Step 5: the client says the PUT succeeded. We don't trust that — we ask
     * S3 whether the object exists and matches what was approved.
     */
    confirmUpload = async (actor: MediaActor, mediaId: number): Promise<Media> => {
        const media = await findMediaById(mediaId);
        if (!media) {
            throw MediaNotFoundError;
        }
        assertCanAccess(actor, media);

        if (media.status === MediaStatus.UPLOADED) {
            return media; // idempotent: confirming twice is fine
        }
        if (media.status === MediaStatus.FAILED) {
            throw MediaUploadFailedError;
        }

        const object = await this.storage.getObjectInfo(media.key);
        if (!object) {
            throw FileNotUploadedError; // stays pending — the client can still upload and retry
        }

        if (object.contentLength !== media.sizeBytes || object.contentType !== media.mimeType) {
            logger.error("Uploaded object does not match media row", {mediaId, key: media.key, object});
            await this.storage.deleteObject(media.key);
            await updateMediaStatus(media.id, MediaStatus.FAILED);
            throw UploadMismatchError;
        }

        return await updateMediaStatus(media.id, MediaStatus.UPLOADED);
    }
}

/** Admins pick any restaurant; restaurant users are pinned to their own. */
function resolveRestaurantId(actor: MediaActor, requested?: number): number {
    if (actor.role === SystemRole.SYSTEM_ADMIN) {
        if (!requested) throw RestaurantIdRequiredError;
        return requested;
    }
    const own = Number(actor.restaurantId);
    if (!own || (requested && requested !== own)) {
        throw UnAuthorisedError;
    }
    return own;
}

function assertCanAccess(actor: MediaActor, media: Media): void {
    if (actor.role === SystemRole.SYSTEM_ADMIN) return;
    if (Number(actor.restaurantId) !== media.restaurantId) {
        // 404 rather than 403 so ids of other restaurants' media aren't confirmable / enumerable.
        throw MediaNotFoundError;
    }
}
