import {plainToInstance} from "class-transformer";
import {validate, ValidationError} from "class-validator";
import {AppError} from "../error/appError";

// Nested DTOs (@ValidateNested) report their failures on `children`, not on
// the parent's `constraints` — walk the whole tree so they are not dropped.
function flattenMessages(errors: ValidationError[]): string[] {
    const out: string[] = [];
    for (const e of errors) {
        if (e.constraints) out.push(...Object.values(e.constraints));
        if (e.children && e.children.length > 0) out.push(...flattenMessages(e.children));
    }
    return out;
}

export async function validateBody <T extends Object>(cls: new () => T, body: unknown) : Promise<T> {
    // const register = new DTO(body)
    const instance = plainToInstance(cls, body); // dto: {email, phone, password} , body: {email, phone, system_role}
    const errors = await validate(instance, {whitelist: true});

    if(errors.length > 0) {
        const messages = flattenMessages(errors);
        throw new AppError(messages.join(', \n') || 'Validation failed', 400)
    }
    return instance;
}
