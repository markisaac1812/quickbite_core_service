import {NextFunction, Request, Response} from "express";
import {inject, injectable} from "tsyringe";
import {TOKENS} from "../../../lib/di/tokens";
import {sendSuccess} from "../../../lib/http/response";
import {validateBody} from "../../../lib/validation/validate";
import {CreateUploadUrlDTO} from "../dto/media.dto";
import {MediaService} from "../service/media.service";
import {MediaNotFoundError} from "../errors";
import {MediaActor} from "../types";

function actorOf(req: Request): MediaActor {
    return {
        userId: Number(req.user?.userId),
        role: req.user?.role as string,
        restaurantId: req.user?.restaurantId ? Number(req.user.restaurantId) : undefined,
    };
}

@injectable()
export class MediaController {
    constructor(@inject(TOKENS.MediaService) private readonly mediaService: MediaService) {}

    createUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(CreateUploadUrlDTO, req.body);
            const result = await this.mediaService.createUploadUrl(actorOf(req), data);
            sendSuccess(res, result, 201);
        } catch (err) {
            next(err);
        }
    }

    confirmUpload = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const mediaId = Number(req.params.id);
            if (!Number.isInteger(mediaId) || mediaId <= 0) throw MediaNotFoundError;
            const media = await this.mediaService.confirmUpload(actorOf(req), mediaId);
            sendSuccess(res, media);
        } catch (err) {
            next(err);
        }
    }
}
