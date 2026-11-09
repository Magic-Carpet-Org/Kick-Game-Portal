import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, email, full_name, name, username, phone, location } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await sql`
            UPDATE "user"
            SET
                name = COALESCE(${name || full_name || null}, name),
                username = COALESCE(${username || null}, username),
                phone = COALESCE(${phone || null}, phone),
                location = COALESCE(${location || null}, location),
                "updatedAt" = NOW()
            WHERE id = ${id};
        `;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
