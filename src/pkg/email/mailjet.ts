import Mailjet from "node-mailjet";
import {IEmailProvider} from "./email.interface";

interface MailjetConfig {
    apiKey: string;
    secretKey: string;
    fromEmail: string;
    fromName: string;
}

export class MailjetEmailProvider implements IEmailProvider {
    private client: Mailjet;
    private fromEmail: string;
    private fromName: string;

    constructor(config: MailjetConfig) {
        this.client = new Mailjet({
            apiKey: config.apiKey,
            apiSecret: config.secretKey,
        });
        this.fromEmail = config.fromEmail;
        this.fromName = config.fromName;
    }

    async send(to: string, subject: string, html: string): Promise<void> {
        await this.client.post("send", {version: "v3.1"}).request({
            Messages: [
                {
                    From: {
                        Email: this.fromEmail,
                        Name: this.fromName,
                    },
                    To: [
                        {
                            Email: to,
                        },
                    ],
                    Subject: subject,
                    HTMLPart: html,
                },
            ],
        });
    }
}
