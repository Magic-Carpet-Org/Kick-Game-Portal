/**
 * Kick Gaming Portal - Email Dispatcher via Resend API
 */

export interface SendOtpEmailParams {
  to: string;
  code: string;
  purpose: 'sign-in' | 'sign-up';
}

export async function sendOtpEmail({ to, code, purpose }: SendOtpEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Kick Gaming <noreply@kick.com.ng>';

  if (!apiKey) {
    console.warn(`[EMAIL OTP] RESEND_API_KEY is not set. OTP for ${to} (${purpose}): ${code}`);
    return { success: true, id: 'mock-dev-id' };
  }

  const isSignUp = purpose === 'sign-up';
  const subject = isSignUp
    ? `Your Kick Gaming Verification Code: ${code}`
    : `Your Kick Gaming Login Code: ${code}`;

  const heading = isSignUp ? 'Welcome to Kick Gaming!' : 'Welcome Back, Gamer';
  const subtext = isSignUp
    ? 'Enter the 6-digit code below to verify your email and choose your gamer tag.'
    : 'Enter the 6-digit code below to sign in to your Kick Gaming account.';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070b09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #070b09; min-height: 100vh; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #111814; border: 1px solid #1f2d24; border-radius: 24px; padding: 36px 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <a href="https://kick.com.ng" target="_blank" style="text-decoration: none; display: inline-block;">
                <img
                  src="https://www.kick.com.ng/3D_green_Kick_logo_4f62e053-removebg-preview.png"
                  alt="Kick Logo"
                  width="180"
                  style="display: block; width: 180px; max-width: 100%; height: auto; border: 0; outline: none; margin: 0 auto;"
                />
              </a>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #9ca3af; max-width: 380px;">
                ${subtext}
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <div style="background-color: #070b09; border: 2px dashed #059669; border-radius: 18px; padding: 18px 24px; display: inline-block; letter-spacing: 8px;">
                <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 34px; font-weight: 900; color: #00c853; text-shadow: 0 0 16px rgba(0, 200, 83, 0.4);">
                  ${code}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry & Notice -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                ⏳ This code will expire in <strong style="color: #d1d5db;">10 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #1f2d24; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; line-height: 18px; color: #4b5563; text-align: center;">
                If you did not request this verification code, please ignore this email or reach out to Kick support. Never share this code with anyone.
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #374151; text-align: center;">
                © ${new Date().getFullYear()} Kick Game Portal. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[EMAIL OTP ERROR] Resend returned status ${res.status}:`, data);
      return { success: false, error: data.message || 'Failed to dispatch email' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[EMAIL OTP EXCEPTION]:', err);
    return { success: false, error: err.message || 'Network error sending email' };
  }
}
