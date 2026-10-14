import { CreateMemberDTO, UpdateMemberDTO,UpdateMemberBranchesDTO } from "../dto/member.dto";
import {CannotCreateOwnerUserError, RoleNotFoundError,MemberNotFoundError,CannotDeleteOwnerError,AssignBranchesToOwnerError,InvalidBranchIdsError} from "../errors";
import {UserAlreadyExistsError} from "../../auth/errors";
import { findUserByEmail,createUser } from "../../user/repository/user.repo";
import {findRoleByName} from "../repository/role.repo";
import{db} from "../../../common/knex/knex";
import {SystemRole} from "../../user/entity/enums";
import { createRestaurantMember, findMemberWithRoleName,updateMember,deleteMember } from "../repository/restaurant_member.repo";
import { MemberStatus } from "../entity/enums";
import { setMemberBranches,countBranchesByIdsAndRestaurant } from "../repository/member-branch.repo";
import { MemberBranch } from "../entity/member-branch.entity";
import { generateOTP, hashOTP } from "../../auth/utils";
import { createPasswordReset } from "../../auth/repository/auth.repo";
import { toMs } from "../../../common/utils/time";
import {getPermissionsDetailsByRoleName} from "../repository/permission.repo";


export class MemberService {
    async createMember(restaurantId: number, data: CreateMemberDTO){
        // dont accept owner role creation
        if(data.role == 'owner') {
            throw CannotCreateOwnerUserError
        }
        // check if user alr exists
        const existingUser = await findUserByEmail(data.email);
        if(existingUser){
            throw UserAlreadyExistsError
        }

        // find roleId by role name
        const roleId = await findRoleByName(data.role);
        if(!roleId){
            throw RoleNotFoundError
        }

        // create user, member, assign branches
        const trx = await db.transaction();
        try {
            const now = new Date();
            const user = await createUser({
                email: data.email,
                name: data.name,
                phone: data.phoneNumber,
                passwordHash: '',
                systemRole: SystemRole.RESTAURANT_USER,
                createdAt: now,
                updatedAt: now,
            }, trx);

            const member = await createRestaurantMember(
                {
                    restaurantId,
                    userId: user.id,
                    roleId,
                    createdAt: now,
                    updatedAt: now,
                    status: MemberStatus.INACTIVE
                }, trx
            )
            // check that those branches belong to that restaurant
            const rows = (data.branchIds ?? []).map(branchId => new MemberBranch({
                branchId: branchId,
                memberId: member.id,
                createdAt: now,
            }))
            await setMemberBranches(member.id, rows, trx)

            // generate otp, create password reset record and send email
            // generate an otp
            const otp = generateOTP();
            // hash the otp
            const hashedOtp = hashOTP(otp);
            // insert the otp
            await createPasswordReset({
                    userId: user.id,
                    otpHashed: hashedOtp,
                    expiresAt: new Date(Date.now() + toMs(1, 'h')),
                    createdAt: new Date(),
                }, trx
            )
            // TODO: send email
            console.log(`mocked email sent ${otp}`)

            await trx.commit()
        }
        catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    async updateMember(restaurantId: number, memberId: number, data: UpdateMemberDTO) {
        // single query: member + role name
        const result = await findMemberWithRoleName(memberId);
        if (!result || Number(result.member.restaurantId) !== Number(restaurantId)) {
            throw MemberNotFoundError;
        }

        const updateData: {roleId?: number, status?: string} = {};
        if (data.role) {
            const roleId = await findRoleByName(data.role);
            if (!roleId) throw RoleNotFoundError;
            updateData.roleId = roleId;
        }
        if (data.status) {
            updateData.status = data.status;
        }

        await updateMember(memberId, updateData);
        return {message: "Member updated successfully"};
    }

    async deleteMember(restaurantId: number, memberId: number) {
        // single query: member + role name (no N+1)
        const result = await findMemberWithRoleName(memberId);
        if (!result || Number(result.member.restaurantId) !== Number(restaurantId)) {
            throw MemberNotFoundError;
        }
        if (result.roleName === 'owner') {
            throw CannotDeleteOwnerError;
        }
        await deleteMember(memberId);
        return {message: "Member deleted successfully"};
    }

    async updateMemberBranches(restaurantId: number, memberId: number, data: UpdateMemberBranchesDTO) {
        // single query: member + role name (no N+1)
        const result = await findMemberWithRoleName(memberId);
        if (!result || Number(result.member.restaurantId) !== Number(restaurantId)) {
            throw MemberNotFoundError;
        }
        if (result.roleName === 'owner') {
            throw AssignBranchesToOwnerError;
        }

        // validate branchIds belong to this restaurant (single COUNT query)
        await this.validateBranchOwnership(data.branchIds, restaurantId);

        const now = new Date();
        const rows = data.branchIds.map(branchId => new MemberBranch({
            branchId,
            memberId: result.member.id,
            createdAt: now,
        }));
        await setMemberBranches(memberId, rows);

        return {
            message: "Member branch assignments updated successfully",
            branchIds: data.branchIds,
        };
    }

    async getRolePermissions(roleName: string) {
        const permissions = await getPermissionsDetailsByRoleName(roleName);
        return {role: roleName, permissions};
    }

     async validateBranchOwnership(branchIds: number[], restaurantId: number) {
        if (branchIds.length === 0) return;
        const count = await countBranchesByIdsAndRestaurant(branchIds, restaurantId);
        if (count !== branchIds.length) {
            throw InvalidBranchIdsError;
        }
    }
}

export const memberService = new MemberService();
       
    