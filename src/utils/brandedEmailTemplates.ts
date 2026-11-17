export type BrandedTemplateKind = 'verify' | 'reset' | 'update';

interface BrandedTemplateParams {
  kind: BrandedTemplateKind;
  actionUrl?: string;
  recipientName?: string;
  customHeadline?: string;
  customMessage?: string;
}

/**
 * Generates a responsive, table-safe HTML email template styled with the 0xDEV
 * navy (#1A1464) and vivid red (#EE1119) brand system.
 */
export function buildBrandedEmailHtml({
  kind,
  actionUrl = 'https://0x4dev.netlify.app/auth-action',
  recipientName = 'Valued Partner',
  customHeadline,
  customMessage,
}: BrandedTemplateParams): string {
  const safeName = recipientName.replace(/[<>]/g, '');
  const safeUrl = actionUrl.replace(/"/g, '&quot;');

  const config =
    kind === 'verify'
      ? {
          eyebrow: 'EMAIL VERIFICATION',
          headline: customHeadline || 'Verify your 0xDEV account email',
          body:
            customMessage ||
            `Hello ${safeName}, thank you for registering with 0xDEV. Please confirm your email address below to activate your client portal access and submit project briefs directly to our engineering studio.`,
          ctaLabel: 'Verify Email Address',
          footnote:
            'If you did not create a 0xDEV account, you can safely ignore this message.',
        }
      : kind === 'reset'
        ? {
            eyebrow: 'PASSWORD RESET',
            headline: customHeadline || 'Reset your 0xDEV password',
            body:
              customMessage ||
              `Hello ${safeName}, we received a request to reset the password for your 0xDEV Client Portal account. Click the button below to choose a new password.`,
            ctaLabel: 'Choose New Password',
            footnote:
              'This reset link expires automatically. If you did not request a reset, no changes have been made to your account.',
          }
        : {
            eyebrow: 'PROJECT STATUS & STUDIO UPDATE',
            headline: customHeadline || 'New update from 0xDEV Studio',
            body:
              customMessage ||
              `Hello ${safeName}, Arigye Wisdom and the 0xDEV engineering team posted a new update on your project dashboard. Sign in below to review the full details.`,
            ctaLabel: 'Open Client Dashboard',
            footnote:
              'You are receiving this notification as an active client or registered member on 0xDEV.',
          };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.headline} — 0xDEV</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F6F7FB;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#4A4F63;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F6F7FB;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E5E7F0;border-radius:16px;overflow:hidden;">
            <!-- Navy Header with Red Accent Bar -->
            <tr>
              <td style="background-color:#1A1464;padding:28px 32px;border-bottom:4px solid #EE1119;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <span style="font-size:24px;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;">Ox</span><span style="font-size:24px;font-weight:800;letter-spacing:-0.03em;color:#EE1119;">DEV</span>
                    </td>
                    <td align="right" style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FFFFFF;opacity:0.8;">
                      Kabale · Global Remote
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding:36px 32px 28px 32px;">
                <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#EE1119;">
                  ${config.eyebrow}
                </p>
                <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.25;font-weight:800;color:#1A1464;">
                  ${config.headline}
                </h1>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#4A4F63;">
                  ${config.body}
                </p>

                <!-- Primary CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:12px;background-color:#EE1119;">
                      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                        ${config.ctaLabel} &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#6B7188;">
                  If the button above does not open automatically, copy and paste this link into your browser:<br />
                  <a href="${safeUrl}" style="color:#1A1464;word-break:break-all;">${safeUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#F6F7FB;padding:22px 32px;border-top:1px solid #E5E7F0;">
                <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#6B7188;">
                  ${config.footnote}
                </p>
                <p style="margin:0;font-size:12px;font-weight:600;color:#1A1464;">
                  0xDEV Technology Studio &middot; Kabale, Western Uganda
                </p>
                <p style="margin:4px 0 0 0;font-size:11px;color:#6B7188;">
                  Lead Contact: Arigye Wisdom &middot; +256 766 922 566 &middot; arigyewisdom7@gmail.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
