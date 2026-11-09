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

        const admins = await sql`
            SELECT 
                id, email, username, name as full_name, image as avatar_url, role, "createdAt" as created_at
            FROM "user"
            WHERE role = 'admin'
            ORDER BY "createdAt" DESC;
        `;

        return NextResponse.json({ success: true, admins });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

