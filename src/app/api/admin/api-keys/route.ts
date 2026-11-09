import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const keys = await sql`
      SELECT 
        k.id, k.key, k.owner_name, k.game_id, k.is_active, k.created_at,
        g.title as game_title
      FROM api_keys k
      LEFT JOIN games g ON k.game_id = g.id
      ORDER BY k.created_at DESC;
    `;

    const games = await sql`
      SELECT id, title
      FROM games
      WHERE status = 'published'
      ORDER BY title ASC;
    `;

    const mappedKeys = keys.map(k => ({
      ...k,
      games: k.game_title ? { title: k.game_title } : undefined
    }));

    return NextResponse.json({ success: true, keys: mappedKeys, games });
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
    const { key, ownerName, gameId } = body;

    if (!key || !ownerName) {
      return NextResponse.json({ error: 'Key and owner name are required' }, { status: 400 });
    }

    const [newKey] = await sql`
      INSERT INTO api_keys (key, owner_name, game_id, is_active)
      VALUES (${key}, ${ownerName}, ${gameId || null}, true)
      RETURNING *;
    `;

    return NextResponse.json({ success: true, key: newKey }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    await sql`
      UPDATE api_keys
      SET is_active = ${isActive}
      WHERE id = ${id};
    `;

    return NextResponse.json({ success: true, message: 'Key status updated' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

