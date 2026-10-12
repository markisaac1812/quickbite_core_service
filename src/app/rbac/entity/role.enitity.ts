export class Role {
    id: number;
    name: string;
    displayName: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<Role>) {
        this.id = data.id!;
        this.name = data.name!;
        this.displayName = data.displayName!;
        this.description = data.description;
        this.createdAt = data.createdAt ?? new Date();
        this.updatedAt = data.updatedAt ?? new Date();
    }

}