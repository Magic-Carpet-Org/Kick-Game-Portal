import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function logIntegrationEvent(
  gameId: string | null,
  endpoint: 'init' | 'match_complete',
  statusCode: number,
  payload: any,
  errorMessage: string | null = null,
  signatureValid: boolean | null = null
) {
  try {
    await sql`
      INSERT INTO integration_logs (
        game_id, endpoint, status_code, payload, error_message, signature_valid
      ) VALUES (
        ${gameId}, ${endpoint}, ${statusCode}, ${JSON.stringify(payload)}, ${errorMessage}, ${signatureValid}
      );
    `;
  } catch (err) {
    console.error('Failed to write integration log:', err);
  }
}

async function updateLastEventReceived(gameId: string) {
  try {
    await sql`
      UPDATE games
      SET last_event_received_at = NOW()
      WHERE id = ${gameId};
    `;
  } catch (err) {
    console.error('Failed to update last_event_received_at:', err);
  }
}

async function processInit(sessionId: string | null) {
  let gameId: string | null = null;
  let responseData: any = null;
  let statusCode = 200;
  let errorMessage: string | null = null;

  try {
    if (!sessionId) {
      statusCode = 400;
      responseData = { error: 'Session ID is required' };
      errorMessage = 'Session ID is required';
      return NextResponse.json(responseData, { status: statusCode });
    }

    // 1. Fetch Game Session Data joined with game and user from Neon
    const sessions = await sql`
      SELECT 
        gs.id, gs.game_id, gs.mode, gs.status,
        g.title as game_title, g.slug as game_slug,
        u.id as user_id, u.name as user_name, u.username, u.image as avatar_url
      FROM game_sessions gs
      LEFT JOIN games g ON gs.game_id = g.id
      LEFT JOIN "user" u ON gs.user_id = u.id
      WHERE gs.id = ${sessionId}
      LIMIT 1;
    `;

    if (sessions.length === 0) {
      statusCode = 404;
      responseData = { error: 'Session not found' };
      errorMessage = 'Session not found';
      return NextResponse.json(responseData, { status: statusCode });
    }

    const session = sessions[0];
    gameId = session.game_id;

    responseData = {
      success: true,
      session: {
        id: session.id,
        mode: session.mode,
        status: session.status,
        game_title: session.game_title || 'Kick Game',
        game_slug: session.game_slug,
      },
      player: {
        id: session.user_id,
        name: session.user_name || 'Anonymous Player',
        username: session.username || session.user_name,
        avatar: session.avatar_url,
      },
    };

    if (gameId) {
      await updateLastEventReceived(gameId);
    }

    return NextResponse.json(responseData, { status: statusCode });
  } catch (err: any) {
    statusCode = 500;
    errorMessage = err.message || 'Server error processing session init';
    responseData = { error: errorMessage };
    return NextResponse.json(responseData, { status: statusCode });
  } finally {
    if (sessionId) {
      await logIntegrationEvent(gameId, 'init', statusCode, { sessionId }, errorMessage, null);
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId') || searchParams.get('roomId');
  return processInit(sessionId);
}

export async function POST(req: Request) {
  let sessionId: string | null = null;
  try {
    const body = await req.json();
    sessionId = body.sessionId || body.roomId || null;
  } catch {
    const { searchParams } = new URL(req.url);
    sessionId = searchParams.get('sessionId') || searchParams.get('roomId');
  }
  return processInit(sessionId);
}
