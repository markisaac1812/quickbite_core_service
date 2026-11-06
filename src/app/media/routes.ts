import {Router} from "express";
import {authenticate} from "../../lib/auth/guard";
import {requireSystemRoles} from "../../lib/auth/rbac";
import {container} from "../../lib/di/container";
import {TOKENS} from "../../lib/di/tokens";
import {SystemRole} from "../user/entity/enums";
import {MediaController} from "./controller/media.controller";

export const mediaRouter = Router();

const mediaController = container.resolve<MediaController>(TOKENS.MediaController);

// Only system admins and restaurant users may upload (product images, restaurant logos).
const canUpload = requireSystemRoles(SystemRole.SYSTEM_ADMIN, SystemRole.RESTAURANT_USER);

// Direct-to-S3 flow:
//   1. POST /media/upload-url     -> backend returns a presigned PUT URL (+ pending media row)
//   2. PUT  <uploadUrl>           -> frontend uploads the file straight to S3
//   3. POST /media/:id/confirm    -> backend verifies the object in S3, marks it uploaded
// Then the frontend passes `url` as product imageUrl / restaurant logoURL.
mediaRouter.post("/upload-url", authenticate, canUpload, mediaController.createUploadUrl);
mediaRouter.post("/:id/confirm", authenticate, canUpload, mediaController.confirmUpload);
