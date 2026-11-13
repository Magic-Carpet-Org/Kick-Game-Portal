import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { generateRandomString } from 'better-auth/crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const username = (body.username || '').trim();
    const otp = (body.otp || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({
        success: false,
        error: 'Gamer tag must be 3-20 characters long (letters, numbers, underscores only)'
      }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ success: false, error: '6-digit verification code is required' }, { status: 400 });
    }

    // 1. Verify username is not taken
    const existingUsername = await sql`
      SELECT id FROM "user" WHERE LOWER(username) = ${username.toLowerCase()} LIMIT 1
    `;
    if (existingUsername.length > 0) {
      return NextResponse.json({ success: false, error: 'This gamer tag is already taken. Please choose another.' }, { status: 400 });
    }

    // 2. Check if email already registered
    const existingUser = await sql`
      SELECT id FROM "user" WHERE LOWER(email) = ${email} LIMIT 1
    `;
    if (existingUser.length > 0) {
      return NextResponse.json({ success: false, error: 'An account already exists with this email. Please sign in.' }, { status: 400 });
    }

    // 3. Verify OTP from Better Auth's verification table
    const verificationRows = await sql`
      SELECT id, identifier, value, "expiresAt" FROM "verification"
      WHERE (
        identifier = ${'email-verification-otp-' + email}
        OR identifier = ${'email-verification:' + email}
        OR identifier = ${'kick-otp:' + email}
        OR identifier = ${email}
      )
        AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    let otpValid = false;
    if (verificationRows.length > 0) {
      const storedVal = verificationRows[0].value || '';
      // Stored as "123456:0" or plain "123456"
      const storedCode = storedVal.split(':')[0].trim();
      if (storedCode === otp) {
        otpValid = true;
      }
    }

    if (!otpValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.'
      }, { status: 400 });
    }

    // 4. Create user account via Better Auth signUpEmail with asResponse: true
    // This automatically creates user, account, session, and crafts signed session cookies!
    const randomPassword = `Kick_${generateRandomString(20)}!`;
    const authRes = await auth.api.signUpEmail({
      body: {
        email,
        password: randomPassword,
        name: username,
        username,
      },
      asResponse: true,
    });

    if (!authRes.ok) {
      const errData = await authRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errData.message || 'Failed to complete registration'
      }, { status: 400 });
    }

    // 5. Update user to mark emailVerified = true and set username
    const createdUser = await sql`
      UPDATE "user"
      SET "emailVerified" = true,
          "username" = ${username},
          "updatedAt" = NOW()
      WHERE LOWER(email) = ${email}
      RETURNING id, name, email, username, role
    `;

    const userId = createdUser[0]?.id;

    // 6. Delete used OTP verification entry
    if (verificationRows[0]?.id) {
      await sql`DELETE FROM "verification" WHERE id = ${verificationRows[0].id}`;
    }

    // 7. Insert Welcome Notification
    if (userId) {
      await sql`
        INSERT INTO notifications (user_id, type, title, message, action_url)
        VALUES (
          ${userId},
          'welcome',
          'Welcome to Kick Gaming!',
          'Your account is ready. Explore top games, climb the leaderboard, and unlock unlimited play.',
          '/dashboard'
        )
      `.catch((e: any) => console.warn('Welcome notification insert warning:', e));
    }

    // 8. Clone response and return with session cookies preserved
    const resHeaders = new Headers(authRes.headers);
    resHeaders.set('Content-Type', 'application/json');

    return new Response(
      JSON.stringify({
        success: true,
        user: createdUser[0] || { email, username },
        message: 'Account created successfully! Welcome to Kick Gaming.',
      }),
      {
        status: 200,
        headers: resHeaders,
      }
    );
  } catch (err: any) {
    console.error('POST /api/auth/complete-signup error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
