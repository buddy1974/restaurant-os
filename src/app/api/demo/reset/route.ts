import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    if (secret !== process.env.DEMO_RESET_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`UPDATE order_items SET kitchen_status = 'new' WHERE order_id IN (SELECT id FROM orders WHERE session_id IN (SELECT id FROM table_sessions WHERE table_id IN (SELECT id FROM tables WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'demo'))))`;
    await sql`UPDATE orders SET payment_status = 'unpaid', kitchen_status = 'new' WHERE session_id IN (SELECT id FROM table_sessions WHERE table_id IN (SELECT id FROM tables WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'demo')))`;
    await sql`UPDATE table_sessions SET status = 'closed', closed_at = now() WHERE table_id IN (SELECT id FROM tables WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'demo')) AND status = 'active'`;
    await sql`UPDATE tables SET status = 'free' WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'demo')`;
    await sql`DELETE FROM push_subscriptions WHERE session_id IN (SELECT id FROM table_sessions WHERE table_id IN (SELECT id FROM tables WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'demo')))`;

    return NextResponse.json({ ok: true, message: 'Demo reset complete' });
  } catch (err) {
    console.error('[demo/reset]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
