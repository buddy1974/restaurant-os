'use client';

import React, { useState } from 'react';
import { SessionSummary, SeatSummary } from '@/hooks/useSessionSummary';
import StripeCheckout from '@/components/customer/StripeCheckout';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

type PaymentMode = 'unit' | 'group' | 'split_equal' | 'split_select';
type PaymentMethod = 'cash' | 'card';
type Step = 'mode' | 'method' | 'split_select' | 'confirm' | 'cash_waiting';

interface Props {
  summary: SessionSummary;
  currentSeatId: string;
  currentSeatCode: string;
  sessionType: 'individual' | 'group';
  isHost: boolean;
  paymentLockedBy: string | null;
  sessionId: string;
  tableNumber: number;
  alreadyPaid: boolean;
  paidByCode?: string;
  onTransferHost: (newHostSeatId: string) => void;
  onClose: () => void;
  onSuccess: (paymentMethod: 'cash' | 'card', paymentMode: string) => void;
}

export default function PaymentModal({
  summary,
  currentSeatId,
  currentSeatCode,
  sessionType,
  isHost,
  paymentLockedBy,
  sessionId,
  tableNumber,
  alreadyPaid,
  paidByCode,
  onTransferHost,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>(sessionType === 'individual' ? 'method' : 'mode');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(sessionType === 'individual' ? 'unit' : null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([currentSeatId]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  const unpaidSeats = summary.seats.filter((s) => !s.paid);
  const currentSeat = summary.seats.find((s) => s.id === currentSeatId);
  const currentSeatTotal = currentSeat?.seat_total || 0;

  const splitEqualAmount = unpaidSeats.length > 0
    ? summary.unpaidTotal / unpaidSeats.length
    : 0;

  const splitSelectTotal = summary.seats
    .filter((s) => selectedSeats.includes(s.id))
    .reduce((sum, s) => sum + Number(s.seat_total), 0);

  function selectMode(mode: PaymentMode) {
    setPaymentMode(mode);
    if (mode === 'split_select') {
      setStep('split_select');
    } else {
      setStep('method');
    }
  }

  function toggleSeat(seatId: string) {
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  }

  function getPayingAmount(): number {
    switch (paymentMode) {
      case 'unit': return currentSeatTotal;
      case 'group': return summary.unpaidTotal;
      case 'split_equal': return splitEqualAmount;
      case 'split_select': return splitSelectTotal;
      default: return 0;
    }
  }

  function getPayingSeatIds(): string[] {
    switch (paymentMode) {
      case 'unit': return [currentSeatId];
      case 'group': return unpaidSeats.map((s) => s.id);
      case 'split_equal': return unpaidSeats.map((s) => s.id);
      case 'split_select': return selectedSeats;
      default: return [];
    }
  }

  async function processPayment() {
    if (!paymentMode || !paymentMethod) return;
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/sessions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: summary.sessionId,
          seatIds: getPayingSeatIds(),
          paymentMode,
          paymentMethod,
        }),
      });

      if (!res.ok) throw new Error('Payment failed');

      if (paymentMethod === 'cash') {
        // Notify waiter via Telegram
        console.log('[PaymentModal] cash payment - tableNumber:', tableNumber, 'seatCode:', currentSeatCode);
        await fetch('/api/call-waiter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableNumber,
            seatCode: currentSeatCode,
            reason: `💰 Cash payment ready — please collect €${getPayingAmount().toFixed(2)}`,
          }),
        }).catch(console.error);

        // Show waiting screen — receipt generated when user dismisses
        setStep('cash_waiting');
        setProcessing(false);
        return;
      }

      onSuccess(paymentMethod, paymentMode);
    } catch {
      setError('Payment could not be processed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <div className="bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          {step !== 'mode' && step !== 'cash_waiting' && !alreadyPaid && !(sessionType === 'individual' && step === 'method') ? (
            <button
              onClick={() => {
                if (step === 'method') setStep('mode');
                if (step === 'split_select') setStep('mode');
                if (step === 'confirm') setStep('method');
              }}
              className="text-gray-400 text-sm"
            >← Back</button>
          ) : <div />}
          <h2 className="font-bold text-lg text-gray-900">
            {alreadyPaid && 'Bill settled'}
            {!alreadyPaid && step === 'mode' && 'How do you want to pay?'}
            {!alreadyPaid && step === 'split_select' && 'Select seats to pay for'}
            {!alreadyPaid && step === 'method' && 'How would you like to pay?'}
            {!alreadyPaid && step === 'confirm' && 'Confirm payment'}
            {!alreadyPaid && step === 'cash_waiting' && 'Payment pending'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">✕</button>
        </div>

        {/* Already paid state */}
        {alreadyPaid && (
          <div className="text-center py-10">
            <p className="text-5xl mb-4">✅</p>
            <p className="font-bold text-xl text-gray-900">Bill settled!</p>
            {paidByCode ? (
              <p className="text-sm text-gray-400 mt-2">
                {seatEmoji[paidByCode] || '🪑'} <strong>{paidByCode}</strong> paid for this table.
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-2">This table has been paid.</p>
            )}
            <p className="text-xs text-gray-300 mt-4">Thank you! Enjoy your meal 🍽️</p>
            <button
              onClick={onClose}
              className="mt-6 w-full border border-gray-200 text-gray-500 py-3 rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        )}

        {!alreadyPaid && (
          <>
            {paymentLockedBy && paymentLockedBy !== currentSeatId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-center">
                <p className="text-2xl mb-1">⏳</p>
                <p className="font-semibold text-yellow-800">Payment in progress</p>
                <p className="text-sm text-yellow-600 mt-1">
                  Another seat is currently processing payment for this table. Please wait.
                </p>
              </div>
            )}

            {/* STEP 1 — Mode Selection */}
            {step === 'mode' && (
              <div className="space-y-3">

                {sessionType === 'individual' && (
                  <button
                    onClick={() => selectMode('unit')}
                    className="w-full border-2 border-gray-100 hover:border-orange-300 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                  >
                    <span className="text-3xl">🧾</span>
                    <div>
                      <p className="font-semibold text-gray-900">Pay my bill</p>
                      <p className="text-sm text-gray-400">
                        Your orders · {formatPrice(currentSeatTotal)}
                      </p>
                    </div>
                  </button>
                )}

                {sessionType === 'group' && (
                  <>
                    <button
                      onClick={() => selectMode('unit')}
                      className="w-full border-2 border-gray-100 hover:border-orange-300 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                    >
                      <span className="text-3xl">🧾</span>
                      <div>
                        <p className="font-semibold text-gray-900">Pay my share</p>
                        <p className="text-sm text-gray-400">
                          Only your orders · {formatPrice(currentSeatTotal)}
                        </p>
                      </div>
                    </button>

                    {isHost && (
                      <button
                        onClick={() => selectMode('group')}
                        className="w-full border-2 border-gray-100 hover:border-orange-300 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                      >
                        <span className="text-3xl">👨‍👩‍👧</span>
                        <div>
                          <p className="font-semibold text-gray-900">Pay for everyone</p>
                          <p className="text-sm text-gray-400">
                            Full table · {formatPrice(summary.unpaidTotal)}
                          </p>
                        </div>
                      </button>
                    )}

                    {isHost && (
                      <button
                        onClick={() => selectMode('split_equal')}
                        className="w-full border-2 border-gray-100 hover:border-orange-300 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                      >
                        <span className="text-3xl">➗</span>
                        <div>
                          <p className="font-semibold text-gray-900">Split equally</p>
                          <p className="text-sm text-gray-400">
                            {unpaidSeats.length} people · {formatPrice(splitEqualAmount)} each
                          </p>
                        </div>
                      </button>
                    )}

                    {isHost && (
                      <button
                        onClick={() => selectMode('split_select')}
                        className="w-full border-2 border-gray-100 hover:border-orange-300 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                      >
                        <span className="text-3xl">🤝</span>
                        <div>
                          <p className="font-semibold text-gray-900">Split with some</p>
                          <p className="text-sm text-gray-400">
                            Choose which seats to combine
                          </p>
                        </div>
                      </button>
                    )}

                    {isHost && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-400 text-center mb-2">
                          Want someone else to manage the bill?
                        </p>
                        <div className="space-y-2">
                          {summary.seats
                            .filter((s) => s.id !== currentSeatId)
                            .map((s) => (
                              <button
                                key={s.id}
                                onClick={() => onTransferHost(s.id)}
                                className="w-full border border-gray-100 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50"
                              >
                                <span>{seatEmoji[s.seat_code as string] || '🪑'}</span>
                                <span>Transfer host to <strong>{s.seat_code as string}</strong></span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 2a — Split Select */}
            {step === 'split_select' && (
              <div>
                <div className="space-y-2 mb-6">
                  {unpaidSeats.map((seat: SeatSummary) => (
                    <button
                      key={seat.id}
                      onClick={() => {
                        if (seat.id !== currentSeatId) toggleSeat(seat.id);
                      }}
                      disabled={seat.id === currentSeatId}
                      className={`w-full border-2 rounded-xl p-4 flex justify-between items-center transition-colors ${
                        selectedSeats.includes(seat.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-100'
                      } ${seat.id === currentSeatId ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{seatEmoji[seat.seat_code as string] || '🪑'}</span>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{seat.seat_code as string}</p>
                          {seat.id === currentSeatId && (
                            <p className="text-xs text-orange-500">You (always included)</p>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-gray-700">{formatPrice(seat.seat_total)}</p>
                    </button>
                  ))}
                </div>

                <div className="border-t pt-4 mb-4 flex justify-between font-bold text-lg">
                  <span>Combined Total</span>
                  <span>{formatPrice(splitSelectTotal)}</span>
                </div>

                <button
                  onClick={() => setStep('method')}
                  disabled={selectedSeats.length === 0}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2b — Payment Method */}
            {step === 'method' && (
              <div>
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-full border-2 rounded-xl p-4 flex items-center gap-4 transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-3xl">💵</span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Pay with Cash</p>
                      <p className="text-sm text-gray-400">A waiter will come to your table</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full border-2 rounded-xl p-4 flex items-center gap-4 transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200'
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
                  <span>You Pay</span>
                  <span>{formatPrice(getPayingAmount())}</span>
                </div>

                <button
                  onClick={() => {
                    if (paymentMethod === 'card') {
                      setShowStripe(true);
                    } else {
                      setStep('confirm');
                    }
                  }}
                  disabled={!paymentMethod}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 3 — Confirm */}
            {step === 'confirm' && (
              <div>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment mode</span>
                    <span className="font-medium capitalize">
                      {paymentMode === 'unit' && 'My bill only'}
                      {paymentMode === 'group' && 'Full table'}
                      {paymentMode === 'split_equal' && 'Split equally'}
                      {paymentMode === 'split_select' && 'Split select'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment method</span>
                    <span className="font-medium capitalize">{paymentMethod}</span>
                  </div>

                  {(paymentMode === 'group' || paymentMode === 'split_select') && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Seats covered:</p>
                      {summary.seats
                        .filter((s) => getPayingSeatIds().includes(s.id))
                        .map((s) => (
                          <div key={s.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                            <span>{seatEmoji[s.seat_code as string] || '🪑'} {s.seat_code as string}</span>
                            <span>{formatPrice(Number(s.seat_total))}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(getPayingAmount())}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center mb-4">{error}</p>
                )}

                <button
                  onClick={processPayment}
                  disabled={processing}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
                >
                  {processing ? 'Processing...' : `Confirm Payment · ${formatPrice(getPayingAmount())}`}
                </button>
              </div>
            )}

            {/* STEP 4 — Cash Waiting */}
            {step === 'cash_waiting' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4 animate-bounce">🔔</div>
                <h2 className="font-black text-xl text-gray-900 mb-2">
                  Waiter is on the way!
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Please have <strong>€{getPayingAmount().toFixed(2)}</strong> ready.
                  A waiter will come to your table to collect payment.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-orange-700">
                    💡 Your receipt will be shown once you tap Done.
                  </p>
                </div>
                <button
                  onClick={() => onSuccess('cash', paymentMode!)}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold"
                >
                  Done
                </button>
              </div>
            )}
          </>
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
              amount={getPayingAmount()}
              sessionId={summary.sessionId}
              seatIds={getPayingSeatIds()}
              paymentMode={paymentMode || 'unit'}
              tableNumber={0}
              onSuccess={() => {
                setShowStripe(false);
                onSuccess('card', paymentMode || 'unit');
              }}
              onCancel={() => setShowStripe(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
