import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    const existing = await sql`
      SELECT id, name, username, email FROM "user" WHERE LOWER(email) = ${email} LIMIT 1
    `;

    const exists = existing.length > 0;

    return NextResponse.json({
      success: true,
      exists,
      user: exists ? { id: existing[0].id, name: existing[0].name, username: existing[0].username } : null,
    });
  } catch (err: any) {
    console.error('POST /api/auth/check-email error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
