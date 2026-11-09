import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { headers } from 'next/headers';
import { checkSubscriptionStatus, normalizeMsisdn } from '@/lib/intelli';

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Fetch user phone if available
    let userPhone: string | null = (session.user as any).phone || null;
    if (!userPhone) {
      const userRows = await sql`
        SELECT phone FROM "user" WHERE id = ${userId} LIMIT 1;
      `;
      if (userRows.length > 0 && userRows[0].phone) {
        userPhone = userRows[0].phone;
      }
    }

    // 2. Fetch distinct local subscription records from Neon DB
    const subRows = await sql`
      SELECT DISTINCT ON (user_id, msisdn, service_id)
        id, msisdn, service_id, sub_status, telco, starts_date, ends_date,
        last_verified_at, raw_response, created_at
      FROM subscriptions
      WHERE user_id = ${userId}
      ORDER BY user_id, msisdn, service_id, created_at DESC;
    `;

    if (!userPhone && subRows.length > 0 && subRows[0].msisdn) {
      userPhone = subRows[0].msisdn;
    }

    // 3. Query Intelli for latest live billing records as well
    let liveBillingRecords: any[] = [];
    let liveActiveSub: any = null;

    if (userPhone) {
      try {
        const normalized = normalizeMsisdn(userPhone);
        const intelliResult = await checkSubscriptionStatus(normalized);
        if (intelliResult.success && intelliResult.data) {
          liveBillingRecords = intelliResult.data.billing_records || [];
          liveActiveSub = intelliResult.data.active_subscription || null;
        }
      } catch (err) {
        console.error('Failed to query live Intelli billing records:', err);
      }
    }

    // De-duplicate all billing records by ID
    const billingMap = new Map<string, any>();

    // 1. From saved raw_responses
    for (const row of subRows) {
      const records = (row as any).raw_response?.billing_records || [];
      for (const b of records) {
        if (b && b.id) billingMap.set(String(b.id), b);
      }
    }

    // 2. From live Intelli query
    for (const b of liveBillingRecords) {
      if (b && b.id) billingMap.set(String(b.id), b);
    }

    const uniqueBilling = Array.from(billingMap.values()).sort(
      (a, b) => new Date(b.created || b.circle_start || 0).getTime() - new Date(a.created || a.circle_start || 0).getTime()
    );

    // Structure the distinct subscription session
    const currentSub = subRows[0] || null;

    return NextResponse.json({
      success: true,
      billing_records: uniqueBilling,
      active_subscription: liveActiveSub || currentSub,
      phone: userPhone,
    });
  } catch (err: any) {
    console.error('Fetch subscription history error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

