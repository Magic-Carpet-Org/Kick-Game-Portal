import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const collectionId = searchParams.get('collectionId');
    const search = searchParams.get('search');
    let userId = searchParams.get('userId');

    if (!userId) {
      try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (session?.user) {
          userId = session.user.id;
        }
      } catch {
        // ignore session extraction error
      }
    }

    if (id) {
      const singleGames = await sql`
        SELECT 
          g.id, g.title, g.slug, g.description, g.thumbnail_url, g.game_image_url, 
          g.game_url, g.version, g.status, 
          GREATEST(COALESCE(g.total_sessions_completed, 0), (SELECT COUNT(*) FROM game_sessions WHERE game_id = g.id))::int as plays, 
          g.created_at
        FROM games g
        WHERE g.id = ${id}
        LIMIT 1;
      `;
      if (singleGames.length === 0) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }

      const game = singleGames[0];

      // Fetch personal best for the authenticated user
      let personalBest = 0;
      if (userId) {
        const pbRows = await sql`
          SELECT MAX(score)::int as pb
          FROM game_sessions
          WHERE game_id = ${id} AND user_id = ${userId} AND score IS NOT NULL;
        `;
        personalBest = pbRows[0]?.pb !== null && pbRows[0]?.pb !== undefined ? Number(pbRows[0].pb) : 0;
      }

      // Fetch all-time top high score for this game
      const topRows = await sql`
        SELECT MAX(score)::int as top_score
        FROM game_sessions
        WHERE game_id = ${id} AND score IS NOT NULL;
      `;
      const allTimeHighScore = topRows[0]?.top_score !== null && topRows[0]?.top_score !== undefined ? Number(topRows[0].top_score) : 0;

      return NextResponse.json({
        success: true,
        game: {
          ...game,
          personal_best: personalBest,
          all_time_high_score: allTimeHighScore,
        },
      });
    }

    let games: any[] = [];
    if (collectionId && collectionId !== 'all') {
      games = await sql`
        SELECT 
          g.id, g.title, g.slug, g.description, g.thumbnail_url, g.game_image_url, 
          g.game_url, g.version, g.status, 
          GREATEST(COALESCE(g.total_sessions_completed, 0), (SELECT COUNT(*) FROM game_sessions WHERE game_id = g.id))::int as plays, 
          g.created_at
        FROM games g
        INNER JOIN collection_games cg ON g.id = cg.game_id
        WHERE cg.collection_id = ${collectionId} AND g.status = 'published'
        ORDER BY cg.position ASC, g.created_at DESC;
      `;
    } else if (search) {
      games = await sql`
        SELECT 
          id, title, slug, description, thumbnail_url, game_image_url, 
          game_url, version, status, 
          GREATEST(COALESCE(total_sessions_completed, 0), (SELECT COUNT(*) FROM game_sessions WHERE game_id = games.id))::int as plays, 
          created_at
        FROM games
        WHERE status = 'published' AND title ILIKE ${'%' + search + '%'}
        ORDER BY created_at DESC;
      `;
    } else {
      games = await sql`
        SELECT 
          id, title, slug, description, thumbnail_url, game_image_url, 
          game_url, version, status, 
          GREATEST(COALESCE(total_sessions_completed, 0), (SELECT COUNT(*) FROM game_sessions WHERE game_id = games.id))::int as plays, 
          created_at
        FROM games
        WHERE status = 'published'
        ORDER BY created_at DESC;
      `;
    }

    return NextResponse.json({ success: true, games });
  } catch (err: any) {
    console.error('Fetch games error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
