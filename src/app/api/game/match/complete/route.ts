import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

async function incrementCompletedSessions(gameId: string) {
  try {
    await sql`
      UPDATE games
      SET total_sessions_completed = COALESCE(total_sessions_completed, 0) + 1
      WHERE id = ${gameId};
    `;
  } catch (err) {
    console.error('Error incrementing sessions count:', err);
  }
}

async function checkAndPromoteGameStatus(gameId: string, currentStatus: string) {
  if (currentStatus === 'testing') {
    try {
      await sql`
        UPDATE games
        SET integration_status = 'live'
        WHERE id = ${gameId};
      `;
      console.log(`Game ${gameId} successfully promoted from testing to live!`);
    } catch (err) {
      console.error('Failed to auto-promote game status to live:', err);
    }
  }
}

export async function POST(req: Request) {
  let gameId: string | null = null;
  let statusCode = 200;
  let errorMessage: string | null = null;
  let signatureValid: boolean | null = null;
  let logPayload: any = null;

  try {
    // 1. OPTIONS preflight handling
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Portal-Signature',
        },
      });
    }

    const bodyText = await req.text();
    logPayload = bodyText;
    let body: any;
    try {
      body = JSON.parse(bodyText);
      logPayload = body;
    } catch {
      statusCode = 400;
      errorMessage = 'Invalid JSON body';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const { sessionId, score } = body;

    if (!sessionId || score === undefined) {
      statusCode = 400;
      errorMessage = 'Missing sessionId or score';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    // 2. Fetch Session and Game Webhook Secret from Neon DB
    const sessions = await sql`
      SELECT 
        gs.id, gs.status, gs.score, gs.is_personal_best, gs.best_score, gs.game_id, gs.user_id,
        g.webhook_secret, g.integration_status
      FROM game_sessions gs
      LEFT JOIN games g ON gs.game_id = g.id
      WHERE gs.id = ${sessionId}
      LIMIT 1;
    `;

    if (sessions.length === 0) {
      statusCode = 404;
      errorMessage = 'Session not found';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const session = sessions[0];
    gameId = session.game_id;
    const webhookSecret = session.webhook_secret;
    const currentStatus = session.integration_status || 'pending';

    if (!webhookSecret) {
      statusCode = 500;
      errorMessage = 'Game webhook secret is not configured';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    // 3. Verify Signature (HMAC-SHA256)
    const signature = req.headers.get('x-portal-signature') || req.headers.get('X-Portal-Signature');
    if (!signature) {
      statusCode = 401;
      errorMessage = 'Missing X-Portal-Signature header';
      signatureValid = false;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');

    if (signature !== expectedSignature) {
      statusCode = 401;
      errorMessage = 'Invalid signature';
      signatureValid = false;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    signatureValid = true;

    // 4. Idempotency Guard: if already completed, return existing results
    if (session.status === 'completed') {
      if (gameId) {
        await updateLastEventReceived(gameId);
        await checkAndPromoteGameStatus(gameId, currentStatus);
      }
      return NextResponse.json({
        success: true,
        message: 'Session already completed (idempotent)',
        score: session.score,
        is_personal_best: session.is_personal_best ?? false,
        best_score: session.best_score ?? session.score,
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 5. Calculate Personal Best
    const bestRows = await sql`
      SELECT MAX(score) as max_score
      FROM game_sessions
      WHERE user_id = ${session.user_id}
        AND game_id = ${session.game_id}
        AND status = 'completed';
    `;

    const previousBest = bestRows[0]?.max_score !== null ? Number(bestRows[0]?.max_score) : null;
    const isPersonalBest = previousBest === null || Number(score) > previousBest;
    const bestScore = isPersonalBest ? Number(score) : previousBest;

    // 6. Update Session in Neon
    await sql`
      UPDATE game_sessions
      SET 
        status = 'completed',
        score = ${Number(score)},
        is_personal_best = ${isPersonalBest},
        best_score = ${bestScore},
        completed_at = NOW()
      WHERE id = ${sessionId};
    `;

    // 7. Update stats & status
    if (gameId) {
      await updateLastEventReceived(gameId);
      await incrementCompletedSessions(gameId);
      await checkAndPromoteGameStatus(gameId, currentStatus);
    }

    return NextResponse.json({
      success: true,
      message: 'Match results processed successfully',
      score: Number(score),
      is_personal_best: isPersonalBest,
      best_score: bestScore,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err: any) {
    statusCode = 500;
    errorMessage = err.message || 'Server error processing match completion';
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  } finally {
    await logIntegrationEvent(gameId, 'match_complete', statusCode, logPayload, errorMessage, signatureValid);
  }
}
