import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET — fetch all orders for a session
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
        SELECT id, order_id, item_id, name, price, quantity, notes
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
    console.error('GET /api/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST — create a new order
export async function POST(request: NextRequest) {
  try {
    const { sessionId, restaurantId, items, notes, seatId } = await request.json();

    if (!sessionId || !restaurantId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'sessionId, restaurantId and items are required' },
        { status: 400 }
      );
    }

    // Calculate total
    const total = items.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    // Create order
    const [order] = await sql`
      INSERT INTO orders (session_id, restaurant_id, total, notes, status, payment_status, seat_id)
      VALUES (${sessionId}, ${restaurantId}, ${total}, ${notes || null}, 'pending', 'unpaid', ${seatId || null})
      RETURNING id, status, payment_status, total, created_at
    `;

    // Insert order items
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, item_id, name, price, quantity, notes)
        VALUES (
          ${order.id},
          ${item.id},
          ${item.name},
          ${item.price},
          ${item.quantity},
          ${item.notes || null}
        )
      `;
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
