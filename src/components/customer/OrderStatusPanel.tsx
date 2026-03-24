'use client';

import { useState, useEffect } from 'react';
import { SessionSummary } from '@/hooks/useSessionSummary';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Suggestion {
  id: string;
  name: string;
  price: number;
  reason: string;
  category: string;
}

interface Props {
  summary: SessionSummary | null;
  currentSeatId: string;
  currentSeatCode: string;
  tableNumber: number;
  restaurantId: string;
  sessionType: 'individual' | 'group';
  isHost: boolean;
  onAddItem: (item: { id: string; name: string; price: number; quantity: number }) => void;
  onCheckout: () => void;
  onCallWaiter: (reason?: string) => void;
}

export default function OrderStatusPanel({
  summary,
  currentSeatId,
  currentSeatCode,
  tableNumber,
  restaurantId,
  sessionType,
  isHost,
  onAddItem,
  onCheckout,
  onCallWaiter,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [showWaiterOptions, setShowWaiterOptions] = useState(false);

  const currentSeat = summary?.seats.find((s) => s.id === currentSeatId);
  const myItems: OrderItem[] = (currentSeat?.items || []).map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
  }));
  const myTotal = currentSeat?.seat_total || 0;
  const groupTotal = summary?.grandTotal || 0;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  const estimatedWait = myItems.length > 0 ? Math.max(10, myItems.length * 5) : 0;

  // Fetch AI suggestions when item count changes
  useEffect(() => {
    if (myItems.length === 0 || !restaurantId) return;

    async function fetchSuggestions() {
      setLoadingSuggestions(true);
      try {
        const res = await fetch('/api/ai-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderedItems: myItems,
            restaurantId,
            sessionId: summary?.sessionId,
          }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myItems.length, restaurantId, summary?.sessionId]);

  async function callWaiter(reason?: string) {
    setCallingWaiter(true);
    setShowWaiterOptions(false);
    try {
      await fetch('/api/call-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber, seatCode: currentSeatCode, reason }),
      });
      setWaiterCalled(true);
      setTimeout(() => setWaiterCalled(false), 30000);
    } catch {
      alert('Could not call waiter. Please try again.');
    } finally {
      setCallingWaiter(false);
    }
    onCallWaiter(reason);
  }

  const showPayButton = sessionType === 'individual' || isHost;
  const hasOrders = myItems.length > 0;

  if (!hasOrders && suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="max-w-lg mx-auto">

        {/* Waiter options popup */}
        {showWaiterOptions && (
          <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-100 rounded-t-2xl shadow-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Why do you need the waiter?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '🍽️ Ready to order', value: 'Ready to order' },
                { label: '💧 Need water', value: 'Needs water' },
                { label: '🧹 Clean table', value: 'Table needs cleaning' },
                { label: '❓ Question', value: 'Has a question' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => callWaiter(opt.value)}
                  className="border border-gray-200 rounded-xl py-2 px-3 text-sm text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWaiterOptions(false)}
              className="w-full mt-3 text-xs text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="px-4 py-3">
          {/* Order status row */}
          {hasOrders && (
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍳</span>
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    {myItems.length} item{myItems.length > 1 ? 's' : ''} in preparation
                  </p>
                  <p className="text-xs text-gray-400">~{estimatedWait} min estimated</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {sessionType === 'group' && isHost ? 'Group total' : 'My bill'}
                </p>
                <p className="text-base font-bold text-orange-600">
                  {formatPrice(sessionType === 'group' && isHost ? groupTotal : myTotal)}
                </p>
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2">
                💡 {loadingSuggestions ? 'Loading suggestions...' : 'You might also like:'}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onAddItem({ id: s.id, name: s.name, price: s.price, quantity: 1 })}
                    className="flex-shrink-0 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-left"
                  >
                    <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.reason}</p>
                    <p className="text-xs font-bold text-orange-600 mt-1">{formatPrice(s.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {waiterCalled ? (
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl py-2 px-3 text-center">
                <p className="text-xs font-semibold text-green-600">✓ Waiter notified</p>
              </div>
            ) : (
              <button
                onClick={() => setShowWaiterOptions(true)}
                disabled={callingWaiter}
                className="flex-1 border border-gray-200 rounded-xl py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                🔔 Call Waiter
              </button>
            )}

            {showPayButton && hasOrders && (
              <button
                onClick={onCheckout}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2 px-3 text-sm font-semibold"
              >
                💳 Pay {formatPrice(sessionType === 'group' && isHost ? groupTotal : myTotal)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
