import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, seatIds, paymentMode, paymentMethod, seatId, action } = await request.json();

    if (action === 'lock') {
      await sql`
        UPDATE table_sessions
        SET payment_locked_by = ${seatId}, payment_locked_at = now()
        WHERE id = ${sessionId} AND payment_locked_by IS NULL
      `;
      const [updated] = await sql`SELECT payment_locked_by FROM table_sessions WHERE id = ${sessionId}`;
      const lockedBy = (updated as { payment_locked_by: string }).payment_locked_by;
      return NextResponse.json({
        success: lockedBy === seatId,
        lockedBy
      });
    }

    if (action === 'unlock') {
      await sql`
        UPDATE table_sessions
        SET payment_locked_by = NULL, payment_locked_at = NULL
        WHERE id = ${sessionId} AND payment_locked_by = ${seatId}
      `;
      return NextResponse.json({ success: true });
    }

    if (action === 'stripe_confirm') {
      for (const seatId of seatIds) {
        await sql`
          UPDATE orders SET payment_status = 'paid', payment_method = 'card'
          WHERE seat_id = ${seatId} AND session_id = ${sessionId}
        `;
        await sql`
          UPDATE seats SET paid = true, payment_mode = ${paymentMode}
          WHERE id = ${seatId}
        `;
      }

      const unpaidSeats = await sql`
        SELECT id FROM seats WHERE session_id = ${sessionId} AND paid = false
      `;

      if (unpaidSeats.length === 0) {
        await sql`
          UPDATE table_sessions SET status = 'closed', closed_at = now()
          WHERE id = ${sessionId}
        `;
        const [session] = await sql`
          SELECT table_id FROM table_sessions WHERE id = ${sessionId}
        `;
        if (session) {
          await sql`UPDATE tables SET status = 'free' WHERE id = ${(session as { table_id: string }).table_id}`;
        }
      }

      // Telegram notification for card payment
      try {
        const [sessionInfo] = await sql`
          SELECT t.number as table_number
          FROM tables t
          JOIN table_sessions ts ON ts.table_id = t.id
          WHERE ts.id = ${sessionId}
        `;
        if (sessionInfo) {
          await sendTelegramMessage(
            `💳 <b>Card Payment Confirmed</b>\n\n📍 Table ${(sessionInfo as { table_number: number }).table_number}\n✅ Payment processed successfully via Stripe`
          );
        }
      } catch (err) {
        console.error('Telegram notification error:', err);
      }

      return NextResponse.json({ success: true });
    }

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

    // Notify staff of payment
    try {
      const [tableInfo] = await sql`
        SELECT t.number FROM tables t
        JOIN table_sessions s ON s.table_id = t.id
        WHERE s.id = ${sessionId}
      `;
      const [payerSeat] = await sql`
        SELECT seat_code FROM seats WHERE id = ${seatIds[0]}
      `;

      const modeLabel: Record<string, string> = {
        unit: 'individual',
        group: 'full table',
        split_equal: 'split equally',
        split_select: 'split select',
      };

      await sendTelegramMessage(
        `💰 <b>Payment Confirmed</b>\n\n📍 Table ${(tableInfo as { number: number }).number}\n👤 Paid by: ${(payerSeat as { seat_code: string }).seat_code}\n💳 Method: ${paymentMethod}\n📋 Mode: ${modeLabel[paymentMode] || paymentMode}\n🪑 Seats covered: ${seatIds.length}`
      );
    } catch (err) {
      console.error('Telegram payment notification failed:', err);
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
