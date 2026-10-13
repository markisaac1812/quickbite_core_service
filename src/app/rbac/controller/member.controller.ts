import { Request, Response, NextFunction } from "express";
import { CreateMemberDTO } from "../dto/member.dto";
import { MemberService, memberService } from "../service/member.service";
import { validateBody } from "../../../common/validation/validate";

export class MemberController {
    constructor(private readonly memberService: MemberService) {}
    createMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(CreateMemberDTO,req.body);
            const result = await this.memberService.createMember(Number(req.params.restaurantId), data);
            res.status(200).send(result);
        }
        catch (error) {
            next(error);
        }
    }
}

export const memberController = new MemberController(memberService);