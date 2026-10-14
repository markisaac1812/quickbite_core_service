import {IsEmail, IsNotEmpty, IsString, IsNumber, IsArray, IsOptional,IsIn} from "class-validator";

export class CreateMemberDTO {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber!: string;

    @IsString()
    @IsNotEmpty()
    role!: string;

    @IsArray()
    @IsOptional()
    branchIds!: number[];
}

export class UpdateMemberDTO {
    @IsString()
    @IsOptional()
    role?: string;

    @IsString()
    @IsOptional()
    @IsIn(['active', 'inactive', 'suspended'])
    status?: string;
}

export class UpdateMemberBranchesDTO {
    @IsArray()
    branchIds!: number[];
}