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
          g.title as game_title,
          gs.game_id,
          COUNT(gs.id)::int as total_plays,
          MAX(gs.completed_at) as last_played_at
        FROM game_sessions gs
        INNER JOIN "user" u ON gs.user_id = u.id
        LEFT JOIN games g ON gs.game_id = g.id
        WHERE gs.game_id = ${gameId} AND gs.status = 'completed' AND gs.score IS NOT NULL
        GROUP BY u.id, u.name, u.username, u.image, g.title, gs.game_id
        ORDER BY high_score DESC
        LIMIT 50;
      `;
    } else {
      leaderboard = await sql`
        WITH RankedSessions AS (
          SELECT 
            gs.user_id,
            gs.game_id,
            g.title as game_title,
            gs.score,
            ROW_NUMBER() OVER(PARTITION BY gs.user_id ORDER BY gs.score DESC, gs.completed_at DESC) as rn
          FROM game_sessions gs
          INNER JOIN games g ON gs.game_id = g.id
          WHERE gs.status = 'completed' AND gs.score IS NOT NULL
        ),
        UserTotals AS (
          SELECT 
            user_id,
            COUNT(id)::int as total_plays,
            MAX(completed_at) as last_played_at
          FROM game_sessions
          WHERE status = 'completed' AND score IS NOT NULL
          GROUP BY user_id
        )
        SELECT 
          u.id as user_id,
          u.name as player_name,
          u.username,
          u.image as avatar_url,
          rs.score::int as high_score,
          rs.game_title,
          rs.game_id,
          ut.total_plays,
          ut.last_played_at
        FROM RankedSessions rs
        INNER JOIN "user" u ON rs.user_id = u.id
        INNER JOIN UserTotals ut ON rs.user_id = ut.user_id
        WHERE rs.rn = 1
        ORDER BY rs.score DESC
        LIMIT 50;
      `;
    }

    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    console.error('Fetch leaderboard error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

