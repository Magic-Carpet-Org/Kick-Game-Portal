import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PUT(request: Request) {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
        }

        const body = await request.json();
        const { userId, email, fullName } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        await sql`
            UPDATE "user"
            SET 
                name = COALESCE(${fullName || null}, name),
                email = COALESCE(${email || null}, email),
                "updatedAt" = NOW()
            WHERE id = ${userId};
        `;

        return NextResponse.json({ success: true, message: 'Admin updated successfully' });
    } catch (err: any) {
        console.error('Error updating admin:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
