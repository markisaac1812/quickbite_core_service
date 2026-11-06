/** Content types we accept, mapped to the file extension used in the object key. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

/** The authenticated caller, as the service needs it. */
export interface MediaActor {
    userId: number;
    role: string;
    restaurantId?: number;
}

export interface UploadUrlResult {
    mediaId: number;
    /** PUT the raw file bytes here, with `headers`. */
    uploadUrl: string;
    method: "PUT";
    headers: Record<string, string>;
    key: string;
    /** Final URL — use it as product imageUrl / restaurant logoURL after confirming. */
    url: string;
    expiresIn: number;
}
