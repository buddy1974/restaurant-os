'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutFormProps {
  amount: number;
  sessionId: string;
  seatIds: string[];
  paymentMode: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ amount, sessionId, seatIds, paymentMode, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(p);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setProcessing(false);
    } else {
      // Also confirm via our API as backup to webhook
      if (sessionId && seatIds.length > 0) {
        await fetch('/api/sessions/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'stripe_confirm',
            sessionId,
            seatIds,
            paymentMode,
            paymentMethod: 'card',
          }),
        }).catch(console.error);
      }
      onSuccess();
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'accordion',
          paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
        }}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="border-t pt-4 flex justify-between font-bold text-lg">
        <span>Total</span>
        <span className="text-orange-600">{formatPrice(amount)}</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!stripe || processing}
        className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition-all"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          `Pay ${formatPrice(amount)}`
        )}
      </button>

      <button
        onClick={onCancel}
        className="w-full border border-gray-200 text-gray-500 py-3 rounded-xl text-sm font-medium"
      >
        ← Go back
      </button>
    </div>
  );
}

interface Props {
  amount: number;
  sessionId: string;
  seatIds: string[];
  paymentMode: string;
  tableNumber: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripeCheckout({
  amount,
  sessionId,
  seatIds,
  paymentMode,
  tableNumber,
  onSuccess,
  onCancel,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createIntent() {
      try {
        const res = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency: 'eur',
            sessionId,
            seatIds,
            paymentMode,
            tableNumber,
          }),
        });
        const data = await res.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError('Failed to initialize payment');
        }
      } catch {
        setError('Failed to connect to payment service');
      } finally {
        setLoading(false);
      }
    }
    createIntent();
  }, [amount, sessionId, seatIds, paymentMode, tableNumber]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Initializing payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={onCancel} className="mt-4 text-sm text-gray-400">Go back</button>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#f97316',
            colorBackground: '#ffffff',
            colorText: '#1a1a1a',
            borderRadius: '12px',
          },
        },
      }}
    >
      <CheckoutForm
        amount={amount}
        sessionId={sessionId}
        seatIds={seatIds}
        paymentMode={paymentMode}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
