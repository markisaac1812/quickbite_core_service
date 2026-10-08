import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsStrongPassword, MaxLength, MinLength, ValidateNested } from "class-validator";
import { RestaurantStatus } from "../entity/enums";

export class CreateRestaurantDTO {
    @ValidateNested()
    @Type(() => CreateRestaurantOwnerDTO)
    owner!: CreateRestaurantOwnerDTO

    @IsString()
    @IsNotEmpty()
    name!:string;

    
    @IsString()
    @IsOptional()
    logoURL?: string;

    @IsNotEmpty()
    @IsString()
    primaryCountry!: string;
}

export class CreateRestaurantOwnerDTO {

    @IsNotEmpty()
    @IsEmail()
    email!:string;

    @MinLength(10)
    @MaxLength(11)
    phone!:string;

    @IsString()
    @MinLength(1)
    name!:string;


    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, {
        message: 'Password is not strong enough. It must contain at least 8 characters, one uppercase letter, one lowercase letter, one number.',
    })
    password!: string;

}
export class UpdateRestaurantDTO {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    name?:string;

    @IsString()
    @IsOptional()
    logoURL?: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    primaryCountry?: string;
}

export class UpdateRestaurantStatusDTO{
    @IsEnum(RestaurantStatus)
    status!: RestaurantStatus;
}
    
    