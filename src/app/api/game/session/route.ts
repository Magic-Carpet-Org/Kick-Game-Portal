import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { signSessionToken, verifySessionToken } from '@/lib/session';
import { checkSubscriptionStatus, normalizeMsisdn } from '@/lib/intelli';
import { headers } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * API Endpoint: POST /api/game/session
 * Description: Checks active telco subscription, creates a new game session in Neon DB, and returns the signed JWT session token.
 */
export async function POST(req: Request) {
  try {
    let userId: string | null = null;
    let userPhone: string | null = null;

    // 1. Authenticate via Better Auth
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (session?.user) {
      userId = session.user.id;
      userPhone = (session.user as any).phone || null;
    }

    // 2. Fallback to existing session token in headers
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        try {
          const cloneReq = req.clone();
          const bodyJson = await cloneReq.json();
          token = bodyJson.sessionToken || '';
        } catch {
          // ignore
        }
      }

      if (token) {
        const decoded = verifySessionToken(token);
        if (decoded) {
          userId = decoded.user_id;
        }
      }
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized: Please log in to play' }, 401);
    }

    // If phone wasn't in session, look up user from Neon DB
    if (!userPhone) {
      const users = await sql`
        SELECT phone FROM "user" WHERE id = ${userId} LIMIT 1;
      `;
      if (users.length > 0) {
        userPhone = users[0].phone;
      }
    }

    const body = await req.json();
    const { gameId } = body;

    if (!gameId) {
      return jsonResponse({ error: 'Missing gameId' }, 400);
    }

    // Verify game exists in Neon
    const games = await sql`
      SELECT id, title, status FROM games WHERE id = ${gameId} LIMIT 1;
    `;
    if (games.length === 0) {
      return jsonResponse({ error: 'Game not found' }, 404);
    }

    // 3. TELCO SUBSCRIPTION CHECK (Pay-to-Play Gate)
    if (userPhone) {
      const normalizedPhone = normalizeMsisdn(userPhone);
      const subCheck = await checkSubscriptionStatus(normalizedPhone);

      const hasActiveSub = Boolean(subCheck.success && subCheck.data?.has_active_subscription);

      if (!hasActiveSub) {
        return jsonResponse({
          error: 'Active subscription required to play this game',
          subscription_required: true,
          msisdn: normalizedPhone,
          client_action: subCheck.data?.client_action || [],
        }, 402); // 402 Payment Required
      }
    }

    // 4. Create Session in Neon DB
    const dummyId = crypto.randomUUID();
    const initialToken = signSessionToken({
      user_id: userId,
      game_id: gameId,
      session_id: dummyId,
    });

    const newSessions = await sql`
      INSERT INTO game_sessions (
        game_id,
        user_id,
        mode,
        status,
        session_token
      ) VALUES (
        ${gameId},
        ${userId},
        'single_player',
        'in_progress',
        ${initialToken}
      )
      RETURNING id, game_id, user_id, status, created_at;
    `;

    const newSession = newSessions[0];

    // Mint final token tied to real session UUID
    const finalToken = signSessionToken({
      user_id: userId,
      game_id: gameId,
      session_id: newSession.id,
    });

    await sql`
      UPDATE game_sessions
      SET session_token = ${finalToken}
      WHERE id = ${newSession.id};
    `;

    return jsonResponse({
      success: true,
      sessionId: newSession.id,
      sessionToken: finalToken,
      session: {
        id: newSession.id,
        game_id: gameId,
        user_id: userId,
        status: newSession.status,
      },
    }, 201);

  } catch (err: any) {
    console.error('Session creation error:', err);
    return jsonResponse({ error: err.message || 'Internal server error' }, 500);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id') || searchParams.get('sessionId');

    if (!sessionId) {
      return jsonResponse({ error: 'Session ID is required' }, 400);
    }

    const [session] = await sql`
      SELECT 
        gs.id, gs.game_id, gs.user_id, gs.mode, gs.status, gs.score, gs.session_token, gs.created_at,
        g.id as game_id, g.title as game_title, g.game_url, g.thumbnail_url
      FROM game_sessions gs
      LEFT JOIN games g ON gs.game_id = g.id
      WHERE gs.id = ${sessionId}
      LIMIT 1;
    `;

    if (!session) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    return jsonResponse({
      success: true,
      session: {
        id: session.id,
        game_id: session.game_id,
        user_id: session.user_id,
        mode: session.mode,
        status: session.status,
        score: session.score,
        session_token: session.session_token,
        created_at: session.created_at,
        game: {
          id: session.game_id,
          title: session.game_title,
          game_url: session.game_url,
          thumbnail_url: session.thumbnail_url,
        }
      }
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, score } = body;

    if (!sessionId || score === undefined || score === null) {
      return jsonResponse({ error: 'Missing sessionId or score' }, 400);
    }

    const sessions = await sql`
      SELECT id, game_id, user_id, status, score, best_score
      FROM game_sessions
      WHERE id = ${sessionId}
      LIMIT 1;
    `;

    if (sessions.length === 0) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    const session = sessions[0];
    const numScore = Number(score);

    // Calculate personal best for this user and game
    const bestRows = await sql`
      SELECT MAX(score) as max_score
      FROM game_sessions
      WHERE user_id = ${session.user_id}
        AND game_id = ${session.game_id}
        AND status = 'completed';
    `;

    const prevBest = bestRows[0]?.max_score !== null && bestRows[0]?.max_score !== undefined
      ? Number(bestRows[0].max_score)
      : null;
    const isPersonalBest = prevBest === null || numScore > prevBest;
    const bestScore = isPersonalBest ? numScore : prevBest;

    // Update game session
    await sql`
      UPDATE game_sessions
      SET 
        status = 'completed',
        score = ${numScore},
        is_personal_best = ${isPersonalBest},
        best_score = ${bestScore},
        completed_at = NOW()
      WHERE id = ${sessionId};
    `;

    // Increment completed sessions on game and update last event
    await sql`
      UPDATE games
      SET 
        total_sessions_completed = COALESCE(total_sessions_completed, 0) + 1,
        last_event_received_at = NOW()
      WHERE id = ${session.game_id};
    `;

    return jsonResponse({
      success: true,
      score: numScore,
      is_personal_best: isPersonalBest,
      best_score: bestScore,
    });
  } catch (err: any) {
    console.error('PATCH session error:', err);
    return jsonResponse({ error: err.message || 'Internal server error' }, 500);
  }
}
