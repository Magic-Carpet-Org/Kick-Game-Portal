import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const [userCount] = await sql`SELECT count(*)::int as count FROM "user";`;
    const [gameCount] = await sql`SELECT count(*)::int as count FROM games;`;
    const [colCount] = await sql`SELECT count(*)::int as count FROM collections;`;
    const [playsSum] = await sql`SELECT COALESCE(SUM(total_sessions_completed), 0)::int as total FROM games;`;

    const recentGames = await sql`
      SELECT id, title, slug, thumbnail_url, game_url, status, total_sessions_completed as plays, created_at
      FROM games
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const collections = await sql`
      SELECT id, name, slug, description, image_url, created_at
      FROM collections
      ORDER BY name ASC;
    `;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: userCount?.count || 0,
        totalGames: gameCount?.count || 0,
        totalPlays: playsSum?.total || 0,
        activeCollections: colCount?.count || 0,
      },
      recentGames,
      collections,
      admin: {
        name: session.user.name,
        email: session.user.email,
        role: (session.user as any).role,
      },
    });

  } catch (err: any) {
    console.error('Admin dashboard API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

