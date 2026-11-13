import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get('username') || '').trim();
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    // 1. Check if the specific username is requested and validate availability
    let isAvailable = false;
    let formatValid = false;

    if (username) {
      // Username validation: 3-20 chars, letters, numbers, underscores, dashes
      const validFormat = /^[a-zA-Z0-9_]{3,20}$/.test(username);
      formatValid = validFormat;

      if (validFormat) {
        const existing = await sql`
          SELECT id FROM "user" WHERE LOWER(username) = ${username.toLowerCase()} LIMIT 1
        `;
        isAvailable = existing.length === 0;
      }
    }

    // 2. Generate suggestions based on email prefix or gaming keywords
    let rawPrefix = 'gamer';
    if (email && email.includes('@')) {
      const parts = email.split('@')[0];
      const cleaned = parts.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (cleaned.length >= 2) {
        rawPrefix = cleaned.substring(0, 10);
      }
    } else if (username && username.length >= 2) {
      rawPrefix = username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 10);
    }

    const candidatePool = [
      `${rawPrefix}_kick`,
      `pro_${rawPrefix}`,
      `shadow_${rawPrefix}`,
      `${rawPrefix}${Math.floor(10 + Math.random() * 89)}`,
      `apex_${rawPrefix}`,
      `cyber_${rawPrefix}`,
      `iron_${rawPrefix}`,
      `${rawPrefix}_ninja`,
    ];

    // Filter candidate pool to ensure unique and available in DB
    const takenCheck = await sql`
      SELECT LOWER(username) as taken FROM "user" 
      WHERE LOWER(username) = ANY(${candidatePool.map(c => c.toLowerCase())})
    `;
    const takenSet = new Set(takenCheck.map((r: any) => r.taken));

    const suggestions = candidatePool
      .filter(c => !takenSet.has(c.toLowerCase()) && c.toLowerCase() !== username.toLowerCase())
      .slice(0, 4);

    return NextResponse.json({
      success: true,
      username,
      formatValid,
      available: isAvailable,
      suggestions,
    });
  } catch (err: any) {
    console.error('GET /api/auth/check-username error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
