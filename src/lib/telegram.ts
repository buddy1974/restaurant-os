const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram not configured');
    return;
  }

  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );
  } catch (error) {
    console.error('Telegram notification failed:', error);
  }
}

export function formatOrderNotification({
  tableNumber,
  seatCode,
  items,
  total,
  paymentMethod,
}: {
  tableNumber: number;
  seatCode: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod?: string;
}): string {
  const seatEmoji: Record<string, string> = {
    APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
    STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
    CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
    PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
    BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
  };

  const emoji = seatEmoji[seatCode] || '🪑';
  const itemLines = items
    .map((i) => `  • ${i.quantity}× ${i.name} — €${(i.price * i.quantity).toFixed(2)}`)
    .join('\n');

  return `🍽️ <b>New Order</b>

📍 Table ${tableNumber} · ${emoji} ${seatCode}
${itemLines}

💰 Total: <b>€${total.toFixed(2)}</b>${paymentMethod ? `\n💳 Payment: ${paymentMethod}` : ''}`;
}
