import { Request, Response, NextFunction } from "express";
import { CreateMemberDTO, UpdateMemberBranchesDTO, UpdateMemberDTO } from "../dto/member.dto";
import { MemberService} from "../service/member.service";
import { validateBody } from "../../../lib/validation/validate";
import { inject,injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens";
import { sendSuccess } from "../../../lib/http/response";
import { RoleQueryRequiredError } from "../errors";

@injectable()
export class MemberController {
    constructor(@inject(TOKENS.MemberService) private readonly memberService: MemberService) {}

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

    listMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.memberService.listMembers(Number(req.params.restaurantId));
            res.status(200).send(result);
        }
        catch (error) {
            next(error);
        }
    }

    updateMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(UpdateMemberDTO, req.body);
            const result = await this.memberService.updateMember(
                Number(req.params.restaurantId),
                Number(req.params.memberId),
                data
            );
            res.status(200).send(result);
        }
        catch (error) {
            next(error);
        }
    }

    deleteMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.memberService.deleteMember(
                Number(req.params.restaurantId),
                Number(req.params.memberId)
            );
            res.status(200).send(result);
        }
        catch (error) {
            next(error);
        }
    }

    updateMemberBranches = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await validateBody(UpdateMemberBranchesDTO, req.body);
            const result = await this.memberService.updateMemberBranches(
                Number(req.params.restaurantId),
                Number(req.params.memberId),
                data
            );
            res.status(200).send(result);
        }
        catch (error) {
            next(error);
        }
    }

    getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.memberService.getRolePermissions(req.params.role as string);
            res.status(200).send(result);
        }
        catch (error) {
            next(error);
        }
    }

    getPermissionsByRole = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const role = String(req.query.role ?? "");
            if (!role) throw RoleQueryRequiredError;
            const result = await this.memberService.getPermissionsByRole(role);
            sendSuccess(res, result);
        }
        catch (error) {
            next(error);
        }
    }

}

