import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const [game] = await sql`
        SELECT 
          g.id, g.title, g.slug, g.description, g.thumbnail_url, g.game_image_url, 
          g.game_url, g.version, g.status, g.webhook_secret, g.integration_status,
          GREATEST(COALESCE(g.total_sessions_completed, 0), (SELECT COUNT(*) FROM game_sessions WHERE game_id = g.id))::int as plays,
          g.last_event_received_at, g.created_at,
          cg.collection_id
        FROM games g
        LEFT JOIN collection_games cg ON g.id = cg.game_id
        WHERE g.id = ${id}
        LIMIT 1;
      `;

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, game });
    }

    const games = await sql`
      SELECT 
        id, title, slug, description, thumbnail_url, game_image_url, 
        game_url, version, status, webhook_secret, integration_status,
        GREATEST(COALESCE(total_sessions_completed, 0), (SELECT COUNT(*) FROM game_sessions WHERE game_id = games.id))::int as plays,
        last_event_received_at, created_at
      FROM games
      ORDER BY created_at DESC;
    `;
    return NextResponse.json({ success: true, games });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      title, 
      slug: customSlug, 
      description, 
      gameUrl, 
      thumbnailUrl, 
      gameImageUrl, 
      version = '1.0.0', 
      status = 'published',
      collectionId 
    } = body;

    if (!title || !gameUrl) {
      return NextResponse.json({ error: 'Title and Game URL are required' }, { status: 400 });
    }

    const slug = (customSlug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const [newGame] = await sql`
      INSERT INTO games (
        title, slug, description, thumbnail_url, game_image_url, game_url, version, status, webhook_secret
      ) VALUES (
        ${title}, ${slug}, ${description || null}, ${thumbnailUrl || null}, ${gameImageUrl || null}, ${gameUrl}, ${version}, ${status}, ${webhookSecret}
      )
      RETURNING *;
    `;

    if (collectionId && newGame?.id) {
      await sql`
        INSERT INTO collection_games (collection_id, game_id)
        VALUES (${collectionId}, ${newGame.id})
        ON CONFLICT (collection_id, game_id) DO NOTHING;
      `;
    }

    // Broadcast new game notification to gamers
    if (newGame?.id && status === 'published') {
      try {
        await sql`
          INSERT INTO notifications (user_id, title, message, type, link, action_label, metadata)
          SELECT 
            id,
            ${'🎮 New Game: ' + title},
            ${'Play ' + title + ' now on Kick! Jump in and set your personal best high score.'},
            'new_game',
            ${'/dashboard/games/' + newGame.id},
            'Play Now',
            ${JSON.stringify({ game_id: newGame.id, game_title: title })}
          FROM "user"
          LIMIT 200;
        `;
      } catch (notifErr) {
        console.error('Failed to broadcast new game notification:', notifErr);
      }
    }

    return NextResponse.json({ success: true, game: newGame }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      id, 
      title, 
      slug: customSlug, 
      description, 
      gameUrl, 
      thumbnailUrl, 
      gameImageUrl, 
      version, 
      status, 
      collectionId 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const slug = customSlug
      ? customSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : undefined;

    const [updatedGame] = await sql`
      UPDATE games
      SET 
        title = COALESCE(${title || null}, title),
        slug = COALESCE(${slug || null}, slug),
        description = COALESCE(${description || null}, description),
        thumbnail_url = COALESCE(${thumbnailUrl || null}, thumbnail_url),
        game_image_url = COALESCE(${gameImageUrl || null}, game_image_url),
        game_url = COALESCE(${gameUrl || null}, game_url),
        version = COALESCE(${version || null}, version),
        status = COALESCE(${status || null}, status),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (collectionId !== undefined) {
      await sql`DELETE FROM collection_games WHERE game_id = ${id};`;
      if (collectionId) {
        await sql`
          INSERT INTO collection_games (collection_id, game_id)
          VALUES (${collectionId}, ${id})
          ON CONFLICT (collection_id, game_id) DO NOTHING;
        `;
      }
    }

    return NextResponse.json({ success: true, game: updatedGame });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM games WHERE id = ${id};`;
    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
