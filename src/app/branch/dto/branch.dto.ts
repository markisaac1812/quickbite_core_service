import {IsString, IsNotEmpty, IsNumber, IsInt, Min, IsEnum, IsBoolean, IsOptional} from "class-validator";
import {BranchCurrency} from "../entity/enums"

export class CreateBranchDTO {
    @IsString()
    @IsNotEmpty()
    countryCode!: string;

    @IsString()
    @IsNotEmpty()
    label!: string;

    @IsString()
    @IsNotEmpty()
    addressText!: string;

    @IsNumber()
    lat!: number;

    @IsNumber()
    lng!: number;

    @IsString()
    opensAt!: string;

    @IsString()
    closesAt!: string;

    @IsInt()
    @Min(0)
    deliveryRadius!: number;

    @IsEnum(BranchCurrency)
    currency!: BranchCurrency
}

export class UpdateBranchDTO {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    label?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    addressText?: string;

    @IsOptional()
    @IsNumber()
    lat?: number;

    @IsOptional()
    @IsNumber()
    lng?: number;

    @IsOptional()
    @IsString()
    opensAt?: string;

    @IsOptional()
    @IsString()
    closesAt?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    deliveryRadius?: number;

    @IsOptional()
    @IsEnum(BranchCurrency)
    currency?: BranchCurrency

    @IsOptional()
    @IsBoolean()
    acceptOrders?: boolean;
}