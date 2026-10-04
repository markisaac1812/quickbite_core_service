import { IsString, MinLength, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { AddressType } from '../entity/enums';

export class CreateAddressDTO {
    @IsString()
    @MinLength(1)
    label!: string;

    @IsString()
    @MinLength(1)
    country!: string;

    @IsString()
    @MinLength(1)
    city!: string;

    @IsString()
    @MinLength(1)
    street!: string;

    @IsOptional()
    @IsString()
    building?: string;

    @IsOptional()
    @IsString()
    apartmentNumber?: string;

    @IsEnum(AddressType)
    type!: AddressType;

    @IsNumber()
    lat!: number;

    @IsNumber()
    lng!: number;

    @IsBoolean()
    isDefault!: boolean;
}

export class UpdateAddressDTO {
     @IsOptional()
    @IsString()
    @MinLength(1)
    label?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    country?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    city?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    street?: string;

    @IsOptional()
    @IsString()
    building?: string;

    @IsOptional()
    @IsString()
    apartmentNumber?: string;

    @IsOptional()
    @IsEnum(AddressType)
    type?: AddressType;

    @IsOptional()
    @IsNumber()
    lat?: number;

    @IsOptional()
    @IsNumber()
    lng?: number;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}