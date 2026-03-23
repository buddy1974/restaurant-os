'use client';

import React, { useState } from 'react';
import { SessionSummary, SeatSummary } from '@/hooks/useSessionSummary';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

type PaymentMode = 'unit' | 'group' | 'split_equal' | 'split_select';
type PaymentMethod = 'cash' | 'card';
type Step = 'mode' | 'method' | 'split_select' | 'confirm';

interface Props {
  summary: SessionSummary;
  currentSeatId: string;
  currentSeatCode: string;
  sessionType: 'individual' | 'group';
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  summary,
  currentSeatId,
  currentSeatCode,
  sessionType,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>('mode');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([currentSeatId]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onSuccess();
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
          {step !== 'mode' ? (
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
            {step === 'mode' && 'How do you want to pay?'}
            {step === 'split_select' && 'Select seats to pay for'}
            {step === 'method' && 'Payment method'}
            {step === 'confirm' && 'Confirm payment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">✕</button>
        </div>

        {/* STEP 1 — Mode Selection */}
        {step === 'mode' && (
          <div className="space-y-3">

            {/* Individual session — only pay my bill */}
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

            {/* Group session — all options */}
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
              onClick={() => setStep('confirm')}
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
              <div className="flex justify-between text-sm text-gray-600">
                <span>Seats covered</span>
                <span className="font-medium">
                  {getPayingSeatIds().length} seat{getPayingSeatIds().length > 1 ? 's' : ''}
                </span>
              </div>
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
      </div>
    </div>
  );
}
