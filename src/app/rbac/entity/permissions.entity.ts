export class Permission {
    id: number;
    resource: string;
    action: string;
    createdAt: Date;

    constructor(data: Partial<Permission>) {
        this.id = data.id!;
        this.resource = data.resource!;
        this.action = data.action!;
        this.createdAt = data.createdAt ?? new Date();
    }
}
