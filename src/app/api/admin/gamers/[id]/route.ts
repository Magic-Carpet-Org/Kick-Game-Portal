import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const [gamer] = await sql`
            SELECT 
                u.id, u.name as full_name, u.username, u.email, u.phone, u.location, 
                u.role, u.image as avatar_url, u."createdAt" as created_at,
                COALESCE(sub.sub_status, 'unsubscribed') as subscription_status,
                sub.telco,
                sub.ends_date as subscription_ends_at
            FROM "user" u
            LEFT JOIN (
                SELECT DISTINCT ON (user_id) user_id, sub_status, telco, ends_date
                FROM subscriptions
                ORDER BY user_id, created_at DESC
            ) sub ON u.id = sub.user_id
            WHERE u.id = ${id}
            LIMIT 1;
        `;

        if (!gamer) {
            return NextResponse.json({ error: "Gamer not found" }, { status: 404 });
        }
        return NextResponse.json({ gamer });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { full_name, name, role, phone, location, username } = body;

        await sql`
            UPDATE "user"
            SET 
                name = COALESCE(${name || full_name || null}, name),
                role = COALESCE(${role || null}, role),
                phone = COALESCE(${phone || null}, phone),
                location = COALESCE(${location || null}, location),
                username = COALESCE(${username || null}, username),
                "updatedAt" = NOW()
            WHERE id = ${id};
        `;

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
        }

        const { id } = await params;
        await sql`DELETE FROM "user" WHERE id = ${id};`;

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
