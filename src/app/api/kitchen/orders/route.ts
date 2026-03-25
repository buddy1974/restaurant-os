import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const rows = await sql`
      SELECT
        o.id as order_id,
        o.created_at,
        o.kitchen_status as order_kitchen_status,
        t.number as table_number,
        t.label as table_label,
        s.seat_code,
        oi.id as item_id,
        oi.quantity,
        oi.kitchen_status as item_status,
        mi.name as item_name,
        mi.price
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN tables t ON t.id = o.table_id
      LEFT JOIN seats s ON s.id = o.seat_id
      JOIN table_sessions ts ON ts.id = o.session_id
      JOIN restaurants r ON r.id = t.restaurant_id
      WHERE r.slug = ${slug}
        AND ts.status = 'active'
        AND o.payment_status != 'paid'
        AND oi.kitchen_status != 'served'
      ORDER BY o.created_at ASC
    `;

    // Group by order
    const ordersMap = new Map<string, {
      orderId: string;
      tableNumber: number;
      tableLabel: string;
      seatCode: string;
      createdAt: string;
      orderKitchenStatus: string;
      items: { id: string; name: string; price: number; quantity: number; status: string }[];
    }>();

    for (const row of rows) {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          orderId: row.order_id,
          tableNumber: row.table_number,
          tableLabel: row.table_label,
          seatCode: row.seat_code || 'Guest',
          createdAt: row.created_at,
          orderKitchenStatus: row.order_kitchen_status,
          items: [],
        });
      }
      ordersMap.get(row.order_id)!.items.push({
        id: row.item_id,
        name: row.item_name,
        price: Number(row.price),
        quantity: row.quantity,
        status: row.item_status,
      });
    }

    return NextResponse.json({ orders: Array.from(ordersMap.values()) });
  } catch (err) {
    console.error('[kitchen/orders GET]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { itemId, orderId, status } = await request.json();

    if (itemId) {
      await sql`UPDATE order_items SET kitchen_status = ${status} WHERE id = ${itemId}`;
    }
    if (orderId) {
      await sql`UPDATE orders SET kitchen_status = ${status} WHERE id = ${orderId}`;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[kitchen/orders PATCH]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
