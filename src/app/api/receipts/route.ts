import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

function generateReceiptNumber(year: number, sequence: number): string {
  return `REC-${year}-${String(sequence).padStart(4, '0')}`;
}

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      seatId,
      restaurantId,
      tableNumber,
      seatCode,
      paymentMethod,
      paymentMode,
      items,
      tipAmount: rawTip,
    }: {
      sessionId: string;
      seatId?: string;
      restaurantId: string;
      tableNumber: number;
      seatCode?: string;
      paymentMethod: string;
      paymentMode: string;
      items: ReceiptItem[];
      tipAmount?: number;
    } = await request.json();

    const tipAmount = Number(rawTip || 0);

    // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const vatRate = 19.00;
    const vatAmount = subtotal * (vatRate / (100 + vatRate));
    const total = subtotal + tipAmount;

    // Generate unique receipt number
    const year = new Date().getFullYear();
    const [seqResult] = await sql`SELECT nextval('receipt_sequence') as seq`;
    const sequence = Number((seqResult as { seq: bigint }).seq);
    const receiptNumber = generateReceiptNumber(year, sequence);

    // Save receipt
    const [receipt] = await sql`
      INSERT INTO receipts (
        receipt_number, restaurant_id, session_id, seat_id,
        table_number, seat_code, payment_method, payment_mode,
        subtotal, vat_rate, vat_amount, tip_amount, total, items
      ) VALUES (
        ${receiptNumber}, ${restaurantId}, ${sessionId}, ${seatId || null},
        ${tableNumber}, ${seatCode || null}, ${paymentMethod}, ${paymentMode},
        ${subtotal.toFixed(2)}, ${vatRate}, ${vatAmount.toFixed(2)},
        ${tipAmount.toFixed(2)}, ${total.toFixed(2)}, ${JSON.stringify(items)}
      )
      RETURNING *
    `;

    // Get restaurant info
    const [restaurant] = await sql`
      SELECT name FROM restaurants WHERE id = ${restaurantId}
    `;

    // Send Telegram receipt copy to staff
    const issuedAt = new Date().toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const itemLines = items
      .map((i) => `• ${i.quantity}× ${i.name} — €${(i.price * i.quantity).toFixed(2)}`)
      .join('\n');

    const seatEmoji: Record<string, string> = {
      APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
      STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
      CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
      PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
      BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
    };

    const emoji = seatCode ? (seatEmoji[seatCode] || '🪑') : '🪑';

    await sendTelegramMessage(
      `🧾 <b>RECEIPT ${receiptNumber}</b>\n\n` +
      `📍 Table ${tableNumber}${seatCode ? ` · ${emoji} ${seatCode}` : ''}\n` +
      `📅 ${issuedAt}\n\n` +
      `<b>ITEMS:</b>\n${itemLines}\n\n` +
      `Subtotal: €${subtotal.toFixed(2)}\n` +
      `VAT (19%): €${vatAmount.toFixed(2)}\n` +
      (tipAmount > 0 ? `Tip: €${tipAmount.toFixed(2)}\n` : '') +
      `<b>TOTAL: €${total.toFixed(2)}</b>\n\n` +
      `${paymentMethod === 'card' ? '💳' : '💵'} ${paymentMethod === 'card' ? 'Card' : 'Cash'} payment\n` +
      `🔑 Ref: ${receiptNumber}`
    );

    return NextResponse.json({
      receipt: {
        ...receipt,
        restaurant_name: (restaurant as { name: string }).name,
        vat_amount: vatAmount.toFixed(2),
        subtotal: subtotal.toFixed(2),
        tip_amount: tipAmount.toFixed(2),
        total: total.toFixed(2),
        items,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/receipts error:', error);
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const receiptNumber = searchParams.get('number');

  if (!receiptNumber) {
    return NextResponse.json({ error: 'number required' }, { status: 400 });
  }

  try {
    const [receipt] = await sql`
      SELECT r.*, rest.name as restaurant_name
      FROM receipts r
      JOIN restaurants rest ON rest.id = r.restaurant_id
      WHERE r.receipt_number = ${receiptNumber}
    `;
    return NextResponse.json({ receipt: receipt || null });
  } catch (error) {
    console.error('GET /api/receipts error:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}
