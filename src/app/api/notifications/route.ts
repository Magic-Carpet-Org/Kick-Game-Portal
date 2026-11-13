import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { headers } from 'next/headers';

// ── GET: Read notifications from Neon DB ─────────────────────────────────────
export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch existing notifications for the user
    const notifications = await sql`
      SELECT 
        id, user_id, title, message, type, link, action_label, read, metadata, created_at
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 60;
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

// ── POST: Insert a new notification ──────────────────────────────────────────
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

// ── PATCH: Mark single or all notifications as read in DB ────────────────────
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
      const updated = await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${userId} AND read = false
        RETURNING id;
      `;
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        count: updated.length,
      });
    }

    if (id) {
      const updated = await sql`
        UPDATE notifications
        SET read = true
        WHERE id = ${id}::uuid AND user_id = ${userId}
        RETURNING id, read;
      `;
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        notification: updated[0] || null,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid request: missing action or id' }, { status: 400 });
  } catch (err: any) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE: Clear all or delete single notification from DB ──────────────────
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
      const deleted = await sql`
        DELETE FROM notifications
        WHERE user_id = ${userId}
        RETURNING id;
      `;
      return NextResponse.json({
        success: true,
        message: 'All notifications cleared',
        count: deleted.length,
      });
    }

    if (id) {
      const deleted = await sql`
        DELETE FROM notifications
        WHERE id = ${id}::uuid AND user_id = ${userId}
        RETURNING id;
      `;
      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
        deletedId: deleted[0]?.id || id,
      });
    }

    return NextResponse.json({ success: false, error: 'Missing id or action query parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('DELETE /api/notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
