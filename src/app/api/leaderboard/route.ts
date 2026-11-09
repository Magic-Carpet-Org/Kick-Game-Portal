import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');

    let leaderboard;
    if (gameId) {
      leaderboard = await sql`
        SELECT 
          u.id as user_id,
          u.name as player_name,
          u.username,
          u.image as avatar_url,
          MAX(gs.score)::int as high_score,
          COUNT(gs.id)::int as total_plays,
          MAX(gs.completed_at) as last_played_at
        FROM game_sessions gs
        INNER JOIN "user" u ON gs.user_id = u.id
        WHERE gs.game_id = ${gameId} AND gs.status = 'completed' AND gs.score IS NOT NULL
        GROUP BY u.id, u.name, u.username, u.image
        ORDER BY high_score DESC
        LIMIT 50;
      `;
    } else {
      leaderboard = await sql`
        SELECT 
          u.id as user_id,
          u.name as player_name,
          u.username,
          u.image as avatar_url,
          MAX(gs.score)::int as high_score,
          COUNT(gs.id)::int as total_plays,
          MAX(gs.completed_at) as last_played_at
        FROM game_sessions gs
        INNER JOIN "user" u ON gs.user_id = u.id
        WHERE gs.status = 'completed' AND gs.score IS NOT NULL
        GROUP BY u.id, u.name, u.username, u.image
        ORDER BY high_score DESC
        LIMIT 50;
      `;
    }

    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    console.error('Fetch leaderboard error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

