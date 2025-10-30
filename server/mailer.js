import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const brandPrimary = '#48ff7c';
const brandBackground = '#050814';
const cardBackground = 'rgba(10, 18, 38, 0.95)';
const borderColor = 'rgba(120, 181, 255, 0.35)';
const bodyText = 'rgba(236, 242, 255, 0.92)';
const secondaryText = 'rgba(198, 216, 255, 0.7)';

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });

const buildVerificationEmailHtml = ({ name, code, preheader }) => {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const safeCode = escapeHtml(code);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your SportConnect X verification code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:${brandBackground};font-family:'Poppins','Segoe UI',Arial,sans-serif;color:${bodyText};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brandBackground};padding:32px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${cardBackground};border-radius:20px;border:1px solid ${borderColor};box-shadow:0 20px 40px rgba(4, 12, 28, 0.45);">
          <tr>
            <td style="padding:32px 40px 28px;text-align:left;">
              <h1 style="margin:0;font-size:24px;color:${brandPrimary};letter-spacing:0.05em;">SportConnect X</h1>
              <p style="margin:28px 0 16px;font-size:16px;line-height:1.6;color:${bodyText};">${greeting}</p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:${bodyText};">
                Welcome to SportConnect X! Enter the one-time code below to activate your account and join the community.
              </p>
              <div style="margin:28px 0;padding:18px 24px;border-radius:14px;border:1px solid ${borderColor};background:linear-gradient(135deg, rgba(72, 255, 124, 0.12), rgba(88, 214, 255, 0.14));text-align:center;">
                <span style="display:inline-block;font-size:32px;letter-spacing:14px;font-weight:700;color:${bodyText};">${safeCode}</span>
              </div>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${secondaryText};">
                This code expires in 10 minutes and can only be used once. Enter it on the verification screen to continue.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:${secondaryText};">
                If you didn't sign up for SportConnect X, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:18px;">
          <tr>
            <td style="text-align:center;padding:0 8px 12px;font-size:12px;line-height:1.6;color:${secondaryText};">
              © ${new Date().getFullYear()} SportConnect X • Eindhoven, Netherlands
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export async function sendVerificationEmail({ to, name, code }) {
  const recipient =
    typeof to === 'string'
      ? to.trim()
      : typeof to === 'object' && to !== null
        ? (to.email ?? to.to ?? '').trim()
        : '';

  if (!recipient) {
    const error = new Error('A valid email recipient is required.');
    error.code = 'EMAIL_DELIVERY_INVALID_RECIPIENT';
    throw error;
  }

  if (!code) {
    const error = new Error('A verification code is required to send the email.');
    error.code = 'EMAIL_DELIVERY_INVALID_CODE';
    throw error;
  }

  const displayName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : '';
  const preheader = 'Use this 6-digit SportConnect X code within 10 minutes to verify your account.';
  const html = buildVerificationEmailHtml({ name: displayName, code, preheader });
  const textLines = [
    `SportConnect X verification code: ${code}`,
    '',
    displayName ? `Hey ${displayName},` : 'Hi there,',
    'Here is your one-time code to activate your SportConnect X account:',
    code,
    '',
    'The code expires in 10 minutes and can only be used once.',
    '',
    "If you didn't sign up for SportConnect X, you can ignore this email.",
  ];

  try {
    const response = await resend.emails.send({
      from: 'SportConnect X <no-reply@sportconnectx.com>',
      to: recipient,
      subject: 'Your SportConnect X verification code',
      html,
      text: textLines.join('\n'),
    });

    console.log('[mailer] Verification email sent', response?.id ?? response);
    return response;
  } catch (error) {
    console.error('[mailer] Failed to send verification email', error);
    const deliveryError = new Error('EMAIL_DELIVERY_FAILED');
    deliveryError.cause = error;
    throw deliveryError;
  }
}
