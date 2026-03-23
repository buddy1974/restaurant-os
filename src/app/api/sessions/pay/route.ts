import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, seatIds, paymentMode, paymentMethod } = await request.json();

    if (!sessionId || !seatIds || !paymentMode || !paymentMethod) {
      return NextResponse.json(
        { error: 'sessionId, seatIds, paymentMode and paymentMethod are required' },
        { status: 400 }
      );
    }

    // Mark all orders for these seats as paid
    for (const seatId of seatIds) {
      await sql`
        UPDATE orders
        SET payment_status = 'paid',
            payment_method = ${paymentMethod}
        WHERE seat_id = ${seatId}
          AND session_id = ${sessionId}
      `;

      await sql`
        UPDATE seats
        SET paid = true,
            payment_mode = ${paymentMode}
        WHERE id = ${seatId}
      `;
    }

    // Check if all seats are now paid — if so close the session
    const unpaidSeats = await sql`
      SELECT id FROM seats
      WHERE session_id = ${sessionId}
        AND paid = false
    `;

    if (unpaidSeats.length === 0) {
      await sql`
        UPDATE table_sessions
        SET status = 'closed', closed_at = now()
        WHERE id = ${sessionId}
      `;

      // Get table_id and free the table
      const [session] = await sql`
        SELECT table_id FROM table_sessions WHERE id = ${sessionId}
      `;

      if (session) {
        await sql`
          UPDATE tables SET status = 'free'
          WHERE id = ${(session as { table_id: string }).table_id}
        `;
      }
    }

    return NextResponse.json({ success: true, remainingUnpaid: unpaidSeats.length });
  } catch (error) {
    console.error('POST /api/sessions/pay error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
