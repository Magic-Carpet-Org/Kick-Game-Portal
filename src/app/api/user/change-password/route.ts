import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is required' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: 'New passwords do not match' }, { status: 400 });
    }

    // Call Better Auth's secure changePassword API
    try {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        },
        headers: reqHeaders,
      });

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (authErr: any) {
      const errMsg = authErr?.message || authErr?.body?.message || 'Failed to change password. Please verify your current password.';
      return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }
  } catch (err: any) {
    console.error('POST /api/user/change-password error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

