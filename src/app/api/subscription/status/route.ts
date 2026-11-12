import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { checkSubscriptionStatus, normalizeMsisdn } from '@/lib/intelli';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let msisdn = searchParams.get('msisdn');
    let userId: string | null = null;

    // 1. Check Authenticated Session via Better Auth
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (session?.user) {
      userId = session.user.id;
      if (!msisdn && (session.user as any).phone) {
        msisdn = (session.user as any).phone;
      }
    }

    // Look up phone number from Neon DB if not present
    if (!msisdn && userId) {
      const userRows = await sql`
        SELECT phone FROM "user" WHERE id = ${userId} LIMIT 1;
      `;
      if (userRows.length > 0 && userRows[0].phone) {
        msisdn = userRows[0].phone;
      } else {
        const subRows = await sql`
          SELECT msisdn FROM subscriptions WHERE user_id = ${userId} AND msisdn IS NOT NULL ORDER BY created_at DESC LIMIT 1;
        `;
        if (subRows.length > 0 && subRows[0].msisdn) {
          msisdn = subRows[0].msisdn;
        }
      }
    }

    if (!msisdn) {
      return NextResponse.json({
        success: true,
        has_active_subscription: false,
        msisdn: null,
        subscription: null,
        client_action: [],
        message: 'No mobile number linked yet',
      });
    }

    const normalizedMsisdn = normalizeMsisdn(msisdn);
    if (!normalizedMsisdn || normalizedMsisdn.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Invalid MSISDN phone format' },
        { status: 400 }
      );
    }

    // 2. Query IntelliHQ API for subscription status
    const intelliResult = await checkSubscriptionStatus(normalizedMsisdn);

    if (!intelliResult.success || !intelliResult.data) {
      return NextResponse.json(
        {
          success: false,
          message: intelliResult.message || 'Unable to retrieve subscription status',
        },
        { status: 502 }
      );
    }

    const data = intelliResult.data;
    const hasActiveSub = Boolean(data.has_active_subscription);
    const activeSub = data.active_subscription;

    // 3. Persist / Update subscription state in Neon DB if user is known
    if (userId) {
      const existingRows = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${userId} AND msisdn = ${normalizedMsisdn} AND service_id = ${data.service_id || 82}
        LIMIT 1;
      `;

      if (existingRows.length > 0) {
        await sql`
          UPDATE subscriptions
          SET
            sub_status = ${hasActiveSub ? 'active' : 'inactive'},
            telco = ${activeSub?.telco || null},
            starts_date = ${activeSub?.starts_date ? new Date(activeSub.starts_date).toISOString() : null},
            ends_date = ${activeSub?.ends_date ? new Date(activeSub.ends_date).toISOString() : null},
            last_verified_at = NOW(),
            raw_response = ${JSON.stringify(data)},
            updated_at = NOW()
          WHERE id = ${existingRows[0].id};
        `;
      } else {
        await sql`
          INSERT INTO subscriptions (
            user_id,
            msisdn,
            service_id,
            sub_status,
            telco,
            starts_date,
            ends_date,
            last_verified_at,
            raw_response
          ) VALUES (
            ${userId},
            ${normalizedMsisdn},
            ${data.service_id || 82},
            ${hasActiveSub ? 'active' : 'inactive'},
            ${activeSub?.telco || null},
            ${activeSub?.starts_date ? new Date(activeSub.starts_date).toISOString() : null},
            ${activeSub?.ends_date ? new Date(activeSub.ends_date).toISOString() : null},
            NOW(),
            ${JSON.stringify(data)}
          );
        `;
      }

      // If active subscription verified, ensure a subscription_success notification exists
      if (hasActiveSub) {
        const recentSubNotif = await sql`
          SELECT id FROM notifications 
          WHERE user_id = ${userId} AND type = 'subscription_success' AND created_at >= NOW() - INTERVAL '24 hours'
          LIMIT 1;
        `;
        if (recentSubNotif.length === 0) {
          await sql`
            INSERT INTO notifications (user_id, title, message, type, link, action_label, metadata)
            VALUES (
              ${userId},
              'Subscription Activated! ⚡',
              ${'Your Kick Gaming Pass is active on +' + normalizedMsisdn + '. Enjoy unlimited game access!'},
              'subscription_success',
              '/dashboard/games',
              'Play Games',
              ${JSON.stringify({ msisdn: normalizedMsisdn, starts_date: activeSub?.starts_date })}
            );
          `;
        }
      }
    }

    return NextResponse.json({
      success: true,
      has_active_subscription: hasActiveSub,
      msisdn: normalizedMsisdn,
      subscription: activeSub,
      client_action: data.client_action || [],
    });
  } catch (err: any) {
    console.error('Subscription Status Route Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

