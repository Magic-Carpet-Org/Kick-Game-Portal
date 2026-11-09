import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const [collection] = await sql`
        SELECT id, name, slug, description, image_url, created_at
        FROM collections
        WHERE id = ${id}
        LIMIT 1;
      `;

      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      const games = await sql`
        SELECT g.id, g.title, g.thumbnail_url
        FROM games g
        JOIN collection_games cg ON g.id = cg.game_id
        WHERE cg.collection_id = ${id}
        ORDER BY cg.created_at DESC;
      `;

      return NextResponse.json({ success: true, collection, games });
    }

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
    const { name, description, imageUrl, collectionId, gameId } = body;

    // Adding game to collection
    if (collectionId && gameId) {
      await sql`
        INSERT INTO collection_games (collection_id, game_id)
        VALUES (${collectionId}, ${gameId})
        ON CONFLICT (collection_id, game_id) DO NOTHING;
      `;
      return NextResponse.json({ success: true, message: 'Game added to collection' });
    }

    if (!name) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const [newCol] = await sql`
      INSERT INTO collections (name, slug, description, image_url)
      VALUES (${name}, ${slug}, ${description || null}, ${imageUrl || null})
      RETURNING *;
    `;

    return NextResponse.json({ success: true, collection: newCol }, { status: 201 });
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
    const { id, name, description, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const [updatedCol] = await sql`
      UPDATE collections
      SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description || null}, description),
        image_url = COALESCE(${imageUrl || null}, image_url)
      WHERE id = ${id}
      RETURNING *;
    `;

    return NextResponse.json({ success: true, collection: updatedCol });
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
    const collectionId = searchParams.get('collectionId');
    const gameId = searchParams.get('gameId');

    // Removing a game from collection
    if (collectionId && gameId) {
      await sql`
        DELETE FROM collection_games 
        WHERE collection_id = ${collectionId} AND game_id = ${gameId};
      `;
      return NextResponse.json({ success: true, message: 'Game removed from collection' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM collections WHERE id = ${id};`;
    return NextResponse.json({ success: true, message: 'Collection deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
