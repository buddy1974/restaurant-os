import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  try {
    const orders = await sql`
      SELECT o.id, o.status, o.payment_method, o.payment_status,
             o.total, o.notes, o.created_at
      FROM orders o
      WHERE o.session_id = ${sessionId}
      ORDER BY o.created_at ASC
    `;

    const orderIds = orders.map((o) => (o as { id: string }).id);
    let items: Record<string, unknown>[] = [];

    if (orderIds.length > 0) {
      items = await sql`
        SELECT id, order_id, name, price, quantity, notes
        FROM order_items
        WHERE order_id = ANY(${orderIds})
      `;
    }

    const ordersWithItems = orders.map((order) => ({
      ...order,
      items: items.filter((item) => item.order_id === (order as { id: string }).id),
    }));

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('GET /api/staff/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, sessionId, tableId, action } = await request.json();

    if (action === 'mark_paid') {
      await sql`
        UPDATE orders
        SET payment_status = 'paid'
        WHERE id = ${orderId}
      `;
    }

    if (action === 'close_table') {
      await sql`
        UPDATE table_sessions
        SET status = 'closed', closed_at = now()
        WHERE id = ${sessionId}
      `;
      await sql`
        UPDATE tables
        SET status = 'free'
        WHERE id = ${tableId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/staff/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}
