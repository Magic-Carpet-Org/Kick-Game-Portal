import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, phone, adminSecret } = body;

    // Guard with admin secret or check if any admin exists
    const expectedSecret = process.env.ADMIN_SEED_SECRET || 'kick-admin-secret-2026';
    if (adminSecret !== expectedSecret) {
      // Also allow if no users exist at all yet
      const countResult = await sql`SELECT count(*)::int as count FROM "user";`;
      if (countResult[0]?.count > 0) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid admin secret or admins already exist' },
          { status: 403 }
        );
      }
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // 1. Create User via Better Auth
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!res || !res.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      );
    }

    // 2. Elevate user role to 'admin' in Neon DB
    await sql`
      UPDATE "user"
      SET role = 'admin',
          phone = ${phone || null},
          updated_at = NOW()
      WHERE id = ${res.user.id};
    `;

    return NextResponse.json({
      success: true,
      message: 'Kick Admin account successfully created and elevated!',
      user: {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        role: 'admin',
      },
    }, { status: 201 });

  } catch (err: any) {
    console.error('Admin seed error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error seeding admin' },
      { status: 500 }
    );
  }
}
