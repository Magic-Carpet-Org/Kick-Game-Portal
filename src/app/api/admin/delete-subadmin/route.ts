import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function DELETE(request: Request) {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        if (userId === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        await sql`DELETE FROM "user" WHERE id = ${userId};`;

        return NextResponse.json({ success: true, message: 'Admin deleted successfully' });
    } catch (err: any) {
        console.error('Delete Admin Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
