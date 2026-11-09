import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const collections = await sql`
      SELECT 
        c.id, c.name, c.slug, c.description, c.image_url, c.created_at,
        COUNT(cg.game_id)::int as game_count
      FROM collections c
      LEFT JOIN collection_games cg ON c.id = cg.collection_id
      GROUP BY c.id
      ORDER BY c.name ASC;
    `;

    return NextResponse.json({ success: true, collections });
  } catch (err: any) {
    console.error('Fetch collections error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

