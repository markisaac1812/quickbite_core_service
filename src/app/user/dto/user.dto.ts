import { IsNotEmpty, IsString } from "class-validator";

export class GetMeDTO{
    @IsString()
    @IsNotEmpty()
    id!: string;
}