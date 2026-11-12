import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { headers } from 'next/headers';

// Helper to format relative or clean dates
function getDiffMinutes(targetDate: Date): number {
  return Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60));
}

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // ── 1. WELCOME NOTIFICATION ──────────────────────────────────────────────
    const welcomeExists = await sql`
      SELECT id FROM notifications
      WHERE user_id = ${userId} AND type = 'welcome'
      LIMIT 1;
    `;

    if (welcomeExists.length === 0) {
      await sql`
        INSERT INTO notifications (
          user_id, title, message, type, link, action_label, metadata
        ) VALUES (
          ${userId},
          'Welcome to Kick Gaming! 🎮',
          'Explore our HTML5 games catalog, compete on live leaderboards, and unlock unlimited play.',
          'welcome',
          '/dashboard/games',
          'Explore Games',
          ${JSON.stringify({ reason: 'onboarding' })}
        );
      `;
    }

    // ── 2. NEW GAME NOTIFICATIONS (Past 14 days) ─────────────────────────────
    const recentGames = await sql`
      SELECT id, title, created_at 
      FROM games 
      WHERE status = 'published' AND created_at >= NOW() - INTERVAL '14 days'
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    for (const g of recentGames) {
      const alreadyNotified = await sql`
        SELECT id FROM notifications
        WHERE user_id = ${userId} AND type = 'new_game' AND metadata->>'game_id' = ${g.id}
        LIMIT 1;
      `;

      if (alreadyNotified.length === 0) {
        await sql`
          INSERT INTO notifications (
            user_id, title, message, type, link, action_label, metadata
          ) VALUES (
            ${userId},
            ${'🎮 New Game: ' + g.title},
            ${'Play ' + g.title + ' now and set the highest score on the leaderboard!'},
            'new_game',
            ${'/dashboard/games/' + g.id},
            'Play Now',
            ${JSON.stringify({ game_id: g.id, game_title: g.title })}
          );
        `;
      }
    }

    // ── 3. SUBSCRIPTION EXPIRY REMINDERS (12h, 6h, 3h, 1h, 30m, 5m, Expired) ─
    const subRows = await sql`
      SELECT id, sub_status, ends_date, starts_date, telco, msisdn
      FROM subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (subRows.length > 0 && subRows[0].ends_date) {
      const sub = subRows[0];
      const endDate = new Date(sub.ends_date);
      const diffMins = getDiffMinutes(endDate);
      const subCycleKey = String(sub.id) + '_' + (sub.starts_date ? new Date(sub.starts_date).toISOString().slice(0, 10) : 'current');

      if (diffMins <= 0) {
        // EXPIRED
        const hasExpiredNotif = await sql`
          SELECT id FROM notifications
          WHERE user_id = ${userId} AND type = 'subscription_expired' AND metadata->>'sub_cycle' = ${subCycleKey}
          LIMIT 1;
        `;
        if (hasExpiredNotif.length === 0) {
          await sql`
            INSERT INTO notifications (
              user_id, title, message, type, link, action_label, metadata
            ) VALUES (
              ${userId},
              '⚠️ Subscription Expired',
              'Your Kick Gaming Pass has ended. Renew with mobile airtime to continue playing and submitting leaderboard scores.',
              'subscription_expired',
              '/dashboard/subscriptions',
              'Renew Pass',
              ${JSON.stringify({ sub_cycle: subCycleKey, interval: 'expired' })}
            );
          `;
        }
      } else {
        // ACTIVE BUT EXPIRING SOON
        let triggerInterval: string | null = null;
        let triggerTitle = '';
        let triggerMessage = '';

        if (diffMins <= 5) {
          triggerInterval = '5m';
          triggerTitle = '⏳ 5 Minutes Remaining!';
          triggerMessage = 'Your Kick Gaming Pass expires in 5 minutes. Renew now to avoid losing access.';
        } else if (diffMins <= 30) {
          triggerInterval = '30m';
          triggerTitle = '⏳ 30 Minutes Remaining';
          triggerMessage = 'Your Kick Gaming Pass expires in 30 minutes. Top up to keep playing.';
        } else if (diffMins <= 60) {
          triggerInterval = '1h';
          triggerTitle = '⏳ 1 Hour Remaining';
          triggerMessage = 'Your Kick Gaming Pass expires in 1 hour.';
        } else if (diffMins <= 180) {
          triggerInterval = '3h';
          triggerTitle = '⏳ 3 Hours Remaining';
          triggerMessage = 'Your Kick Gaming Pass will expire in 3 hours.';
        } else if (diffMins <= 360) {
          triggerInterval = '6h';
          triggerTitle = '⏳ 6 Hours Remaining';
          triggerMessage = 'Your Kick Gaming Pass expires in 6 hours.';
        } else if (diffMins <= 720) {
          triggerInterval = '12h';
          triggerTitle = '⏳ 12 Hours Remaining';
          triggerMessage = 'Half a day left on your Kick Gaming Pass.';
        }

        if (triggerInterval) {
          const hasIntervalNotif = await sql`
            SELECT id FROM notifications
            WHERE user_id = ${userId} 
              AND type = 'subscription_expiring' 
              AND metadata->>'sub_cycle' = ${subCycleKey}
              AND metadata->>'interval' = ${triggerInterval}
            LIMIT 1;
          `;

          if (hasIntervalNotif.length === 0) {
            await sql`
              INSERT INTO notifications (
                user_id, title, message, type, link, action_label, metadata
              ) VALUES (
                ${userId},
                ${triggerTitle},
                ${triggerMessage},
                'subscription_expiring',
                '/dashboard/subscriptions',
                'Renew Now',
                ${JSON.stringify({ sub_cycle: subCycleKey, interval: triggerInterval })}
              );
            `;
          }
        }
      }
    }

    // ── 4. FETCH NOTIFICATIONS LIST ──────────────────────────────────────────
    const notifications = await sql`
      SELECT 
        id, user_id, title, message, type, link, action_label, read, metadata, created_at
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { title, message, type = 'system', link, action_label, metadata = {} } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const [notif] = await sql`
      INSERT INTO notifications (
        user_id, title, message, type, link, action_label, metadata
      ) VALUES (
        ${userId}, ${title}, ${message}, ${type}, ${link || null}, ${action_label || null}, ${JSON.stringify(metadata)}
      )
      RETURNING *;
    `;

    return NextResponse.json({ success: true, notification: notif }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { action, id } = body;

    if (action === 'mark_all_read') {
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${userId} AND read = false;
      `;
      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (id) {
      await sql`
        UPDATE notifications
        SET read = true
        WHERE id = ${id} AND user_id = ${userId};
      `;
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clear_all') {
      await sql`
        DELETE FROM notifications
        WHERE user_id = ${userId};
      `;
      return NextResponse.json({ success: true, message: 'All notifications cleared' });
    }

    if (id) {
      await sql`
        DELETE FROM notifications
        WHERE id = ${id} AND user_id = ${userId};
      `;
      return NextResponse.json({ success: true, message: 'Notification deleted' });
    }

    return NextResponse.json({ success: false, error: 'Missing id or action' }, { status: 400 });
  } catch (err: any) {
    console.error('DELETE /api/notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
