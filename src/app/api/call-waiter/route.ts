import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const { tableNumber, seatCode, reason } = await request.json();

    const message = `🔔 <b>Waiter Needed</b>\n\n📍 Table ${tableNumber} · ${seatCode || ''}\n${reason ? `💬 Reason: ${reason}` : '💬 Customer needs assistance'}\n\nPlease go to Table ${tableNumber}.`;

    await sendTelegramMessage(message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call waiter error:', error);
    return NextResponse.json({ error: 'Failed to call waiter' }, { status: 500 });
  }
}
