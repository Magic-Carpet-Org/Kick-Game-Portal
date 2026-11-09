import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const gamers = await sql`
      SELECT 
        u.id, u.name as full_name, u.username, u.email, u.phone, u.location, 
        u.role, u.image as avatar_url, u."createdAt" as created_at,
        COALESCE(sub.sub_status, 'unsubscribed') as subscription_status,
        sub.telco,
        sub.ends_date as subscription_ends_at
      FROM "user" u
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) user_id, sub_status, telco, ends_date
        FROM subscriptions
        ORDER BY user_id, created_at DESC
      ) sub ON u.id = sub.user_id
      WHERE u.role != 'admin'
      ORDER BY u."createdAt" DESC;
    `;

    return NextResponse.json({ gamers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
