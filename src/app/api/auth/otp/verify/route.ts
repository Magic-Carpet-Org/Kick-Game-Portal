import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();
    const mode = body.mode === 'sign-up' ? 'sign-up' : 'sign-in';

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ success: false, error: 'Valid email and 6-digit code are required.' }, { status: 400 });
    }

    // Query Neon DB verification table
    const identifierVerify = `email-verification:${email}`;
    const identifierSignIn = `sign-in:${email}`;
    const identifierKick = `kick-otp:${email}`;

    const rows = await sql`
      SELECT id, identifier, value, "expiresAt" FROM "verification"
      WHERE identifier IN (${identifierVerify}, ${identifierSignIn}, ${identifierKick})
        AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      }, { status: 400 });
    }

    const storedRaw = rows[0].value || '';
    const storedCode = storedRaw.split(':')[0].trim();

    if (storedCode !== code) {
      return NextResponse.json({
        success: false,
        error: 'Invalid verification code. Please check your inbox and try again.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      mode,
    });
  } catch (err: any) {
    console.error('POST /api/auth/otp/verify error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
