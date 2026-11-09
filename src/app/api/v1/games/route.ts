import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401, headers: corsHeaders });
    }

    // 1. Validate API Key from Neon
    const keys = await sql`
      SELECT id, key, owner_name, game_id, is_active
      FROM api_keys
      WHERE key = ${apiKey} AND is_active = true
      LIMIT 1;
    `;

    if (keys.length === 0) {
      return NextResponse.json({ error: 'Invalid or Inactive API Key' }, { status: 403, headers: corsHeaders });
    }

    const keyData = keys[0];

    // 2. Fetch Games based on Scope
    let games;
    if (keyData.game_id) {
      games = await sql`
        SELECT id, title, description, thumbnail_url, game_url, slug, version, created_at
        FROM games
        WHERE status = 'published' AND id = ${keyData.game_id}
        ORDER BY created_at DESC;
      `;
    } else {
      games = await sql`
        SELECT id, title, description, thumbnail_url, game_url, slug, version, created_at
        FROM games
        WHERE status = 'published'
        ORDER BY created_at DESC;
      `;
    }

    return NextResponse.json({
      owner: keyData.owner_name,
      games: games,
    }, {
      headers: corsHeaders,
    });

  } catch (error: any) {
    console.error('API Uncaught Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
