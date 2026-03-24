'use client';

import { useState } from 'react';
import { SessionSummary, SeatSummary } from '@/hooks/useSessionSummary';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

interface Props {
  summary: SessionSummary;
  hostSeatCode: string;
  onClose: () => void;
  onSuccess: () => void;
  sessionId: string;
}

export default function GroupBillModal({ summary, hostSeatCode, onClose, onSuccess, sessionId }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'bill' | 'method' | 'confirm'>('bill');

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  async function confirmPayment() {
    if (!paymentMethod) return;
    setProcessing(true);
    try {
      const allSeatIds = summary.seats.map((s) => s.id);
      const res = await fetch('/api/sessions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          seatIds: allSeatIds,
          paymentMode: 'group',
          paymentMethod,
        }),
      });
      if (!res.ok) throw new Error('Payment failed');
      onSuccess();
    } catch {
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <div className="bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center mb-4">
          {step !== 'bill' ? (
            <button
              onClick={() => setStep(step === 'confirm' ? 'method' : 'bill')}
              className="text-gray-400 text-sm"
            >← Back</button>
          ) : <div />}
          <h2 className="font-bold text-lg">
            {step === 'bill' && '👑 Group Bill'}
            {step === 'method' && 'How to pay?'}
            {step === 'confirm' && 'Confirm Payment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">✕</button>
        </div>

        {step === 'bill' && (
          <>
            <p className="text-sm text-gray-400 text-center mb-4">
              As host, you are paying for all seats
            </p>

            <div className="space-y-2 mb-4">
              {summary.seats.map((seat: SeatSummary) => (
                <div key={seat.id} className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{seatEmoji[seat.seat_code as string] || '🪑'}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{seat.seat_code as string}</p>
                      {(seat.seat_code as string) === hostSeatCode && (
                        <p className="text-xs text-orange-500">You (host)</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {seat.orders.length} order{seat.orders.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-800">{formatPrice(seat.seat_total)}</p>
                </div>
              ))}
            </div>

            <div className="border-t-2 pt-4 mb-6 flex justify-between font-black text-xl">
              <span>Total</span>
              <span className="text-orange-600">{formatPrice(summary.grandTotal)}</span>
            </div>

            <button
              onClick={() => setStep('method')}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg"
            >
              Continue to Payment →
            </button>
          </>
        )}

        {step === 'method' && (
          <>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`w-full border-2 rounded-xl p-4 flex items-center gap-4 transition-colors ${
                  paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <span className="text-3xl">💵</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Pay with Cash</p>
                  <p className="text-sm text-gray-400">Waiter will come to collect</p>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full border-2 rounded-xl p-4 flex items-center gap-4 transition-colors ${
                  paymentMethod === 'card' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <span className="text-3xl">💳</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Pay with Card</p>
                  <p className="text-sm text-gray-400">Pay securely by card</p>
                </div>
              </button>
            </div>

            <div className="border-t pt-4 mb-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(summary.grandTotal)}</span>
            </div>

            <button
              onClick={() => setStep('confirm')}
              disabled={!paymentMethod}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment type</span>
                <span className="font-medium">Full group bill</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Method</span>
                <span className="font-medium capitalize">{paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Seats</span>
                <span className="font-medium">{summary.seats.length}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-xl">
                <span>Total</span>
                <span className="text-orange-600">{formatPrice(summary.grandTotal)}</span>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-700 text-center mb-4">
                A waiter will come to your table to collect payment
              </div>
            )}

            <button
              onClick={confirmPayment}
              disabled={processing}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Confirm · ${formatPrice(summary.grandTotal)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
