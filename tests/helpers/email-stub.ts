import {IEmailProvider} from "../../src/pkg/email/email.interface";

export class EmailStub implements IEmailProvider {
  sent:Array<{to:string, subject:string, body:string}> = [];
  async send(to: string, subject: string, html: string): Promise<void> {
    this.sent.push({to, subject, body: html});
  }
  reset():void {
    this.sent = [];
  }
}

export const emailStub = new EmailStub();