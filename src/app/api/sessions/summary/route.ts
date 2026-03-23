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
    // Get all seats for this session
    const seats = await sql`
      SELECT id, seat_code, joined_at, paid, payment_mode
      FROM seats
      WHERE session_id = ${sessionId}
      ORDER BY joined_at ASC
    `;

    // Get all orders for this session
    const orders = await sql`
      SELECT o.id, o.seat_id, o.total, o.payment_status,
             o.payment_method, o.status, o.created_at
      FROM orders o
      WHERE o.session_id = ${sessionId}
      ORDER BY o.created_at ASC
    `;

    const orderIds = orders.map((o) => (o as { id: string }).id);
    let items: Record<string, unknown>[] = [];

    if (orderIds.length > 0) {
      items = await sql`
        SELECT id, order_id, name, price, quantity
        FROM order_items
        WHERE order_id = ANY(${orderIds})
      `;
    }

    // Build seat summaries
    const seatSummaries = seats.map((seat) => {
      const seatOrders = orders.filter(
        (o) => (o as { seat_id: string }).seat_id === (seat as { id: string }).id
      );
      const seatItems = items.filter((item) =>
        seatOrders.some((o) => (o as { id: string }).id === item.order_id)
      );
      const seatTotal = seatOrders.reduce(
        (sum, o) => sum + Number((o as { total: number }).total),
        0
      );
      const isPaid = seatOrders.every(
        (o) => (o as { payment_status: string }).payment_status === 'paid'
      ) && seatOrders.length > 0;

      return {
        id: seat.id,
        seat_code: seat.seat_code,
        joined_at: seat.joined_at,
        paid: isPaid,
        seat_total: seatTotal,
        orders: seatOrders,
        items: seatItems,
      };
    });

    const grandTotal = seatSummaries.reduce(
      (sum, s) => sum + s.seat_total,
      0
    );

    const unpaidTotal = seatSummaries
      .filter((s) => !s.paid)
      .reduce((sum, s) => sum + s.seat_total, 0);

    return NextResponse.json({
      sessionId,
      seats: seatSummaries,
      grandTotal,
      unpaidTotal,
      seatCount: seats.length,
    });
  } catch (error) {
    console.error('GET /api/sessions/summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session summary' },
      { status: 500 }
    );
  }
}
