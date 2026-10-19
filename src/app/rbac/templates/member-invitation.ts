export function memberInvitationEmail(otp: string, role: string): { subject: string; html: string } {
    return {
        subject: "You're Invited to QuickBite",
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:40px;">
                    <tr>
                        <td style="text-align:center; padding-bottom:24px;">
                            <h1 style="margin:0; font-size:24px; color:#18181b;">Team Invitation</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size:16px; color:#3f3f46; line-height:1.5; padding-bottom:24px;">
                            You've been invited to join a restaurant on QuickBite as <strong>${role}</strong>. Use the code below to set up your account.
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom:24px;">
                            <div style="display:inline-block; background:#f4f4f5; border-radius:8px; padding:16px 32px; font-size:32px; font-weight:bold; letter-spacing:6px; color:#18181b;">
                                ${otp}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size:14px; color:#71717a; line-height:1.5;">
                            This code expires in <strong>7 days</strong>. If you did not expect this invitation, you can safely ignore this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`.trim(),
    };
}
