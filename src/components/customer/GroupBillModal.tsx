'use client';

import { useState } from 'react';
import { SessionSummary, SeatSummary } from '@/hooks/useSessionSummary';
import StripeCheckout from '@/components/customer/StripeCheckout';

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
  onSuccess: (paymentMethod: 'cash' | 'card', tipAmount: number) => void;
  sessionId: string;
  tableNumber: number;
}

export default function GroupBillModal({ summary, hostSeatCode, onClose, onSuccess, sessionId, tableNumber }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'bill' | 'method' | 'tip' | 'confirm' | 'cash_waiting'>('bill');
  const [error, setError] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [tipPercent, setTipPercent] = useState(0);

  const tipAmount = summary.grandTotal * (tipPercent / 100);
  const totalWithTip = summary.grandTotal + tipAmount;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  function handleBack() {
    if (step === 'method') setStep('bill');
    else if (step === 'tip') setStep('method');
    else if (step === 'confirm') setStep('tip');
  }

  async function confirmPayment() {
    if (!paymentMethod) return;
    setProcessing(true);
    setError(null);
    try {
      // Step 1 — Notify waiter FIRST via Telegram
      await fetch('/api/call-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          seatCode: hostSeatCode,
          reason: `💰 Group cash payment ready — please collect €${totalWithTip.toFixed(2)} from ${hostSeatCode}${tipPercent > 0 ? ` (incl. ${tipPercent}% tip)` : ''}`,
        }),
      });

      // Step 2 — Show waiting screen (do NOT mark paid yet)
      setStep('cash_waiting');
      setProcessing(false);
    } catch {
      setError('Payment failed. Please try again.');
      setProcessing(false);
    }
  }

  async function confirmCashPayment() {
    setProcessing(true);
    setError(null);
    try {
      const allSeatIds = summary.seats.map((s) => s.id);
      const res = await fetch('/api/sessions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          seatIds: allSeatIds,
          paymentMode: 'group',
          paymentMethod: 'cash',
          tipAmount,
        }),
      });
      if (!res.ok) throw new Error('Failed to confirm payment');
      onSuccess('cash', tipAmount);
    } catch {
      setError('Could not confirm payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  const stepTitle = {
    bill: '👑 Group Bill',
    method: 'How to pay?',
    tip: 'Add a tip?',
    confirm: 'Confirm Payment',
    cash_waiting: 'Payment pending',
  }[step];

  const showBack = step !== 'bill' && step !== 'cash_waiting';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <div className="bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center mb-4">
          {showBack ? (
            <button onClick={handleBack} className="text-gray-400 text-sm">← Back</button>
          ) : <div />}
          <h2 className="font-bold text-lg">{stepTitle}</h2>
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
              onClick={() => setStep('tip')}
              disabled={!paymentMethod}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </>
        )}

        {step === 'tip' && (
          <>
            <p className="text-sm text-gray-400 text-center mb-4">
              Would you like to leave a tip for the team?
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTipPercent(pct)}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 transition-colors ${
                    tipPercent === pct
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
            </div>

            {tipPercent > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-4">
                <p className="text-sm font-semibold text-green-700">
                  🙏 Thank you! Adding {formatPrice(tipAmount)} tip
                </p>
              </div>
            )}

            <div className="border-t pt-4 mb-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Bill</span>
                <span>{formatPrice(summary.grandTotal)}</span>
              </div>
              {tipPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Tip ({tipPercent}%)</span>
                  <span>+{formatPrice(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(totalWithTip)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (paymentMethod === 'card') {
                  setShowStripe(true);
                } else {
                  setStep('confirm');
                }
              }}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold"
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
              {tipPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Tip ({tipPercent}%)</span>
                  <span className="font-medium">+{formatPrice(tipAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-xl">
                <span>Total</span>
                <span className="text-orange-600">{formatPrice(totalWithTip)}</span>
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
              {processing ? 'Processing...' : `Confirm · ${formatPrice(totalWithTip)}`}
            </button>
          </>
        )}

        {step === 'cash_waiting' && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="font-black text-xl text-gray-900 mb-2">
              Waiter is on the way!
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              Please have your payment ready:
            </p>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl py-4 px-6 mb-6">
              <p className="text-3xl font-black text-orange-600">
                €{totalWithTip.toFixed(2)}
              </p>
              <p className="text-xs text-orange-400 mt-1">
                Cash · Full group bill{tipPercent > 0 ? ` · incl. ${tipPercent}% tip` : ''}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 text-sm text-blue-600">
              💡 Tap the button below <strong>only after</strong> the waiter has collected your cash.
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-3">{error}</p>
            )}

            <button
              onClick={confirmCashPayment}
              disabled={processing}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 mb-3"
            >
              {processing ? 'Confirming...' : '✅ I have paid — get my receipt'}
            </button>

            <button
              onClick={onClose}
              className="w-full border border-gray-200 text-gray-400 py-3 rounded-xl text-sm"
            >
              Keep open
            </button>
          </div>
        )}
      </div>

      {showStripe && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Card Payment</h2>
              <button onClick={() => setShowStripe(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <StripeCheckout
              amount={totalWithTip}
              sessionId={sessionId}
              seatIds={summary.seats.map((s) => s.id)}
              paymentMode="group"
              tableNumber={tableNumber}
              onSuccess={() => {
                setShowStripe(false);
                onSuccess('card', tipAmount);
              }}
              onCancel={() => setShowStripe(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
