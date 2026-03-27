import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    await sql`
      UPDATE order_items
      SET kitchen_status = 'served'
      WHERE order_id IN (
        SELECT o.id FROM orders o
        JOIN table_sessions ts ON ts.id = o.session_id
        JOIN tables t ON t.id = ts.table_id
        JOIN restaurants r ON r.id = t.restaurant_id
        WHERE r.slug = ${slug}
          AND ts.status = 'active'
      )
      AND kitchen_status = 'ready'
    `;

    await sql`
      UPDATE orders
      SET kitchen_status = 'served'
      WHERE id IN (
        SELECT o.id FROM orders o
        JOIN table_sessions ts ON ts.id = o.session_id
        JOIN tables t ON t.id = ts.table_id
        JOIN restaurants r ON r.id = t.restaurant_id
        WHERE r.slug = ${slug}
          AND ts.status = 'active'
      )
      AND kitchen_status = 'ready'
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[kitchen/clear]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
