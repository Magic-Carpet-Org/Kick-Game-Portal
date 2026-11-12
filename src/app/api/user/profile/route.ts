import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { headers } from 'next/headers';
import { normalizeMsisdn } from '@/lib/intelli';

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Fetch user from Neon DB
    const userRows = await sql`
      SELECT 
        id, name, email, "emailVerified", image, "createdAt", "updatedAt",
        phone, role, location, username
      FROM "user"
      WHERE id = ${userId}
      LIMIT 1;
    `;

    if (userRows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userRows[0];

    // 2. Fetch gaming stats for profile
    const statsRows = await sql`
      SELECT 
        COALESCE(MAX(score), 0)::int as peak_score,
        COUNT(id)::int as total_matches
      FROM game_sessions
      WHERE user_id = ${userId} AND status = 'completed';
    `;

    // 3. Fetch latest subscription
    const subRows = await sql`
      SELECT sub_status, ends_date, telco, msisdn
      FROM subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const latestSub = subRows[0] || null;
    const isSubActive = Boolean(
      latestSub &&
      (latestSub.sub_status === 'active' || latestSub.sub_status === 'ACTIVE') &&
      (!latestSub.ends_date || new Date(latestSub.ends_date).getTime() > Date.now())
    );

    return NextResponse.json({
      success: true,
      user,
      stats: {
        peak_score: statsRows[0]?.peak_score || 0,
        total_matches: statsRows[0]?.total_matches || 0,
        is_sub_active: isSubActive,
        latest_subscription: latestSub,
      },
    });
  } catch (err: any) {
    console.error('GET /api/user/profile error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { name, username, email, phone, location } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username ? username.trim().toLowerCase() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedName = name.trim();
    const trimmedLocation = location ? location.trim() : null;

    // Check email uniqueness if changed
    if (trimmedEmail !== session.user.email?.toLowerCase()) {
      const emailConflict = await sql`
        SELECT id FROM "user"
        WHERE LOWER(email) = ${trimmedEmail} AND id != ${userId}
        LIMIT 1;
      `;
      if (emailConflict.length > 0) {
        return NextResponse.json({ success: false, error: 'Email address is already in use by another account' }, { status: 409 });
      }
    }

    // Check username uniqueness if provided and changed
    if (trimmedUsername) {
      const usernameConflict = await sql`
        SELECT id FROM "user"
        WHERE LOWER(username) = ${trimmedUsername} AND id != ${userId}
        LIMIT 1;
      `;
      if (usernameConflict.length > 0) {
        return NextResponse.json({ success: false, error: 'Username is already taken' }, { status: 409 });
      }
    }

    // Normalize phone number if provided
    let normalizedPhone = trimmedPhone;
    if (trimmedPhone) {
      normalizedPhone = normalizeMsisdn(trimmedPhone);
    }

    // Update "user" table
    const [updatedUser] = await sql`
      UPDATE "user"
      SET 
        name = ${trimmedName},
        email = ${trimmedEmail},
        username = ${trimmedUsername},
        phone = ${normalizedPhone},
        location = ${trimmedLocation},
        "updatedAt" = NOW()
      WHERE id = ${userId}
      RETURNING *;
    `;

    // Also sync email in "account" table if credential provider is used
    if (trimmedEmail !== session.user.email?.toLowerCase()) {
      await sql`
        UPDATE "account"
        SET "accountId" = ${trimmedEmail}, "updatedAt" = NOW()
        WHERE "userId" = ${userId} AND "providerId" = 'credential';
      `;
    }

    // If phone changed, also update subscriptions table for this user if existing
    if (normalizedPhone) {
      await sql`
        UPDATE subscriptions
        SET msisdn = ${normalizedPhone}, updated_at = NOW()
        WHERE user_id = ${userId};
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('PATCH /api/user/profile error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

