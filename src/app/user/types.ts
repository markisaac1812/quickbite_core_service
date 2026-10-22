import {SystemRole} from "./entity/enums";

export interface CreateUserData {
    email: string;
    phone: string;
    name: string;
    password: string;
    systemRole: SystemRole;
}
