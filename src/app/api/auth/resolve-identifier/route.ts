import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { normalizeMsisdn } from '@/lib/intelli';

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();
    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
    }

    const trimmed = identifier.trim();

    // 1. If already an email, return directly
    if (trimmed.includes('@')) {
      return NextResponse.json({ email: trimmed });
    }

    // 2. Try looking up by Phone Number or Username
    const normalized = normalizeMsisdn(trimmed);
    const rawDigits = trimmed.replace(/[^0-9]/g, '');

    const users = await sql`
      SELECT email FROM "user"
      WHERE phone = ${trimmed}
         OR phone = ${normalized}
         OR phone = ${rawDigits}
         OR username = ${trimmed}
      LIMIT 1;
    `;

    if (users.length > 0 && users[0].email) {
      return NextResponse.json({ email: users[0].email });
    }

    // If no match found, fallback to the entered value
    return NextResponse.json({ email: trimmed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

