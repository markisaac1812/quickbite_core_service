import {MailjetEmailProvider} from "../../pkg/email/mailjet";
import {env} from "../config/env";

export const emailProvider = new MailjetEmailProvider({
    apiKey: env.mailjet.apiKey,
    secretKey: env.mailjet.secretKey,
    fromEmail: env.mailjet.fromEmail,
    fromName: env.mailjet.fromName,
});
