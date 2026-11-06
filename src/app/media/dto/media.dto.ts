import {IsIn, IsInt, IsOptional, Max, Min} from "class-validator";
import {env} from "../../../lib/config/env";
import {ALLOWED_IMAGE_TYPES} from "../types";

export class CreateUploadUrlDTO {
    @IsIn(Object.keys(ALLOWED_IMAGE_TYPES), {message: `contentType must be one of: ${Object.keys(ALLOWED_IMAGE_TYPES).join(", ")}`})
    contentType!: string;

    /** Exact file size in bytes — it is signed into the URL, so S3 rejects any other size. */
    @IsInt()
    @Min(1)
    @Max(env.media.maxFileSizeBytes, {message: `size must not exceed ${env.media.maxFileSizeBytes} bytes`})
    size!: number;

    /** Required for system admins. Restaurant users can omit it (defaults to their own restaurant). */
    @IsOptional()
    @IsInt()
    @Min(1)
    restaurantId?: number;
}
