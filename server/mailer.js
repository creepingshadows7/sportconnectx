import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to, code) {
  const verificationLink = `https://www.sportconnectx.com/verify-email?code=${code}`;

  try {
    const response = await resend.emails.send({
      from: 'SportConnect X <no-reply@sportconnectx.com>',
      to: typeof to === 'string' ? to : to.email ?? to.to, // ✅ Fixes Resend expecting a string
      subject: 'Verify your SportConnect X account',
      html: `
        <h2>Welcome to SportConnect X!</h2>
        <p>Click below to verify your email:</p>
        <a href="${verificationLink}"
          style="background-color:#16a34a;color:white;padding:10px 20px;
          border-radius:6px;text-decoration:none;">Verify Email</a>
        <p>If you didn’t request this, you can ignore this message.</p>
      `,
    });

    console.log('✅ Verification email sent:', response);
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw new Error('EMAIL_DELIVERY_FAILED');
  }
}
