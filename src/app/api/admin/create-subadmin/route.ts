import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, fullName } = body;

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create user with Better Auth
        const newUser = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: fullName,
                role: 'admin',
            }
        });

        // Ensure role is admin
        await sql`
            UPDATE "user"
            SET role = 'admin'
            WHERE email = ${email};
        `;

        return NextResponse.json({ success: true, user: newUser });
    } catch (err: any) {
        console.error('Error creating admin:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
