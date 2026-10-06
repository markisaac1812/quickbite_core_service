import {IsEmail, MinLength, IsString, IsStrongPassword, MaxLength, IsEnum, IsNotEmpty, IS_LENGTH, length, Length, IsOptional, ValidateNested} from "class-validator";
import {SystemRole} from "../../user/entity/enums";
import { Type } from "class-transformer";

export class RegisterDTO {
    @IsEmail()
    email!: string;

    @MinLength(10)
    @MaxLength(11)
    phone!: string;

    @IsString()
    @MinLength(1)
    name!: string;

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

    @IsEnum(SystemRole)
    role!: SystemRole;

    @IsOptional()
    @ValidateNested()
    @Type(() => RestaurantRegisterDTO)
    restaurant?:RestaurantRegisterDTO;
}

export class LoginDTO {
    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    
    password!: string;
}

export class ForgotPasswordDTO {
    @IsEmail()
    email!: string;
}

export class ResetPasswordDTO {
    @IsEmail()
    email!: string;
    
    @IsString()
    @IsNotEmpty()
    @Length(6)
    otp!: string;

    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, {
        message: 'Password is not strong enough. It must contain at least 8 characters, one uppercase letter, one lowercase letter, one number.',
    })
    newPassword!: string;
}

export class RestaurantRegisterDTO {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    name!: string;

    @IsString()
    @IsOptional()
    logoURL!: string;


    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    primaryCountry!: string;
}