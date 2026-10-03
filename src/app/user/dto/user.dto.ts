import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
export class UpdateUserDTO{
    @IsString()
    @MinLength(1)
    @IsOptional()
    name?: string;

   @IsOptional()
   @MinLength(10)
   @MaxLength(11)
    phone?: string;
}