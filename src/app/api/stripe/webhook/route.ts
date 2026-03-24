import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export async function POST(request: NextRequest) {
  const body = await request.text();

  // For now process without webhook secret validation (add later for production)
  let event: Stripe.Event;

  try {
    event = JSON.parse(body) as Stripe.Event;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { sessionId, seatIds, paymentMode, tableNumber } = paymentIntent.metadata;

    try {
      const parsedSeatIds = JSON.parse(seatIds || '[]');

      // Mark seats as paid
      for (const seatId of parsedSeatIds) {
        await sql`
          UPDATE orders SET payment_status = 'paid', payment_method = 'card'
          WHERE seat_id = ${seatId} AND session_id = ${sessionId}
        `;
        await sql`
          UPDATE seats SET paid = true, payment_mode = ${paymentMode}
          WHERE id = ${seatId}
        `;
      }

      // Check if all seats paid
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
          await sql`
            UPDATE tables SET status = 'free'
            WHERE id = ${(session as { table_id: string }).table_id}
          `;
        }
      }

      await sendTelegramMessage(
        `💳 <b>Card Payment Confirmed</b>\n\n📍 Table ${tableNumber}\n💰 Amount: €${(paymentIntent.amount / 100).toFixed(2)}\n✅ Stripe payment successful`
      );
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  return NextResponse.json({ received: true });
}

// Required to disable body parsing for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};
