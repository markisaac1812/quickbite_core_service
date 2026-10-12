export class MemberBranch {
    memberId: number;
    branchId: number;
    createdAt: Date;

    constructor(data: Partial<MemberBranch>) {
        this.memberId = data.memberId!;
        this.branchId = data.branchId!;
        this.createdAt = data.createdAt ?? new Date();
    }
}
