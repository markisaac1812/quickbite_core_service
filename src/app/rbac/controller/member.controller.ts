import { Request, Response, NextFunction } from "express";
import { CreateMemberDTO, UpdateMemberBranchesDTO, UpdateMemberDTO } from "../dto/member.dto";
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

}

export const memberController = new MemberController(memberService);