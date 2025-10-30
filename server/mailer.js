import process from 'process';
import nodemailer from 'nodemailer';

const {
  SMTP_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  SMTP_FROM,
  SMTP_REQUIRE_TLS,
  SMTP_IGNORE_TLS,
} = process.env;

let transporter = null;

const resolveSecureFlag = () => {
  if (typeof SMTP_SECURE === 'string') {
    return SMTP_SECURE.toLowerCase() === 'true';
  }
  return Number(SMTP_PORT) === 465;
};

const buildTransporter = () => {
  if (SMTP_URL) {
    return nodemailer.createTransport(SMTP_URL);
  }

  if (!SMTP_HOST || !SMTP_PORT) {
    return null;
  }

  const options = {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: resolveSecureFlag(),
  };

  if (SMTP_USER && SMTP_PASS) {
    options.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }

  if (SMTP_REQUIRE_TLS) {
    options.requireTLS = SMTP_REQUIRE_TLS.toLowerCase() === 'true';
  }

  if (SMTP_IGNORE_TLS) {
    options.ignoreTLS = SMTP_IGNORE_TLS.toLowerCase() === 'true';
  }

  return nodemailer.createTransport(options);
};

const ensureTransporter = () => {
  if (!transporter) {
    transporter = buildTransporter();
  }

  if (!transporter) {
    const error = new Error('Email transport is not configured. Set SMTP credentials to enable delivery.');
    error.code = 'EMAIL_TRANSPORT_UNAVAILABLE';
    throw error;
  }

  return transporter;
};

const fromAddress = SMTP_FROM || 'SportConnect X <no-reply@sportconnectx.local>';

const buildVerificationEmail = ({ name, code }) => {
  const safeName = name || 'SportConnect X member';
  return {
    subject: 'Verify your SportConnect X account',
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#040a14;padding:32px 0;font-family:Inter,'Segoe UI',sans-serif;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#0b1426;border-radius:24px;padding:36px;color:#e7f2ff;">
              <tr>
                <td align="center" style="padding-bottom:16px;">
                  <span style="display:inline-block;padding:10px 18px;border-radius:999px;background:rgba(122,255,162,0.16);border:1px solid rgba(122,255,162,0.4);color:#7affa2;letter-spacing:0.18em;font-size:11px;text-transform:uppercase;">SportConnect X</span>
                </td>
              </tr>
              <tr>
                <td>
                  <h1 style="margin:0;font-size:28px;line-height:1.3;color:#e7f2ff;text-align:center;">Confirm your email, ${safeName}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 0 28px;">
                  <p style="margin:0;font-size:16px;line-height:1.6;text-align:center;color:rgba(221,234,255,0.86);">
                    Plug in your verification code below to unlock the SportConnect X community and start designing meaningful sporting moments together.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <div style="display:inline-flex;align-items:center;justify-content:center;padding:18px 32px;border-radius:22px;background:linear-gradient(135deg,#5dff8e,#58d6ff);color:#04111f;font-size:28px;font-weight:700;letter-spacing:0.4em;">
                    ${code.split('').join(' ')}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(173,199,242,0.85);text-align:center;">
                    This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding-top:32px;border-top:1px solid rgba(122,255,162,0.2);text-align:center;color:rgba(173,199,242,0.6);font-size:12px;">
                  Crafted for the SportConnect X prototype &mdash; let’s keep sporters moving.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  };
};

export async function sendVerificationEmail({ to, name, code }) {
  const message = buildVerificationEmail({ name, code });
  const activeTransporter = ensureTransporter();
  try {
    await activeTransporter.sendMail({
      from: fromAddress,
      to,
      subject: message.subject,
      html: message.html,
    });
  } catch (cause) {
    const error = new Error('Failed to deliver verification email.');
    error.code = 'EMAIL_DELIVERY_FAILED';
    error.cause = cause;
    throw error;
  }
}

