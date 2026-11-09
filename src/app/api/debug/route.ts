import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
    try {
        const [result] = await sql`SELECT NOW() as current_time, COUNT(*)::int as user_count FROM "user";`;
        return NextResponse.json({
            status: 'OK',
            database: 'Neon PostgreSQL',
            time: result.current_time,
            userCount: result.user_count,
        });
    } catch (e: any) {
        return NextResponse.json({ status: 'Error', message: e.message }, { status: 500 });
    }
}
