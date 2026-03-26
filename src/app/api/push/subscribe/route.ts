import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { subscription, sessionId, seatId } = await request.json();
    const { endpoint, keys } = subscription;
    await sql`
      INSERT INTO push_subscriptions (session_id, seat_id, endpoint, p256dh, auth)
      VALUES (${sessionId}, ${seatId || null}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
      ON CONFLICT (endpoint) DO UPDATE
      SET session_id = ${sessionId}, seat_id = ${seatId || null}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
