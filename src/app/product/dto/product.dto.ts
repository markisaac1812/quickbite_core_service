import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateProductDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    categoryName?: string;
}
