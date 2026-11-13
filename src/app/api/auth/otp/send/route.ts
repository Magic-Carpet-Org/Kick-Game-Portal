import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';
import { generateRandomString } from 'better-auth/crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const mode = body.mode === 'sign-up' ? 'sign-up' : 'sign-in';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required.' }, { status: 400 });
    }

    // 1. Check if user already exists
    const existingUsers = await sql`
      SELECT id, name, username, email FROM "user" WHERE LOWER(email) = ${email} LIMIT 1
    `;
    const userExists = existingUsers.length > 0;

    if (mode === 'sign-in' && !userExists) {
      return NextResponse.json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'No account found with this email. Would you like to create one?',
      }, { status: 404 });
    }

    if (mode === 'sign-up' && userExists) {
      return NextResponse.json({
        success: false,
        code: 'USER_EXISTS',
        error: 'An account already exists with this email. Please sign in.',
      }, { status: 409 });
    }

    // 2. Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Store in Neon DB "verification" table
    // Store under both Better Auth's standard identifier and kick-otp identifier
    const identifierSignIn = `sign-in:${email}`;
    const identifierVerify = `email-verification:${email}`;
    const identifierKick = `kick-otp:${email}`;
    const storedValue = `${otp}:0`;

    // Clean up any previous OTPs for this email
    await sql`
      DELETE FROM "verification"
      WHERE identifier IN (${identifierSignIn}, ${identifierVerify}, ${identifierKick})
    `;

    // Insert for sign-in or sign-up
    const activeIdentifier = mode === 'sign-in' ? identifierSignIn : identifierVerify;
    const verificationId = generateRandomString(32);

    await sql`
      INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
      VALUES (${verificationId}, ${activeIdentifier}, ${storedValue}, ${expiresAt.toISOString()}, NOW(), NOW())
    `;

    // Also insert general kick-otp identifier for fallback verification
    const kickVerificationId = generateRandomString(32);
    await sql`
      INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
      VALUES (${kickVerificationId}, ${identifierKick}, ${storedValue}, ${expiresAt.toISOString()}, NOW(), NOW())
    `;

    console.log(`[AUTH OTP DISPATCH] Generated OTP ${otp} for ${email} (${mode})`);

    // 4. Dispatch Email via Resend
    const emailResult = await sendOtpEmail({
      to: email,
      code: otp,
      purpose: mode,
    });

    if (!emailResult.success) {
      console.error('[AUTH OTP DISPATCH ERROR]:', emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to dispatch verification email. Please check your address.',
      }, { status: 500 });
    }

    console.log(`[AUTH OTP DISPATCH SUCCESS] Delivered to Resend ID: ${emailResult.id}`);

    return NextResponse.json({
      success: true,
      message: `A 6-digit code has been sent to ${email}`,
      mode,
    });
  } catch (err: any) {
    console.error('POST /api/auth/otp/send error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error',
    }, { status: 500 });
  }
}
