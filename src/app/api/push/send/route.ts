import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

const sql = neon(process.env.DATABASE_URL!);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, seatId, title, body } = await request.json();

    let subs;
    if (seatId) {
      subs = await sql`SELECT * FROM push_subscriptions WHERE seat_id = ${seatId}`;
    } else {
      subs = await sql`SELECT * FROM push_subscriptions WHERE session_id = ${sessionId}`;
    }

    const payload = JSON.stringify({ title, body });
    const results = await Promise.allSettled(
      subs.map((sub) => {
        const endpoint = sub.endpoint as string;
        const p256dh = sub.p256dh as string;
        const auth = sub.auth as string;
        return webpush.sendNotification(
          { endpoint, keys: { p256dh, auth } },
          payload
        );
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error('[push/send]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
