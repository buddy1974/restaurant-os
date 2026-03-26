'use client';

import { useState, useEffect, useRef } from 'react';
import { SessionSummary, SeatSummary } from '@/hooks/useSessionSummary';
import { useLanguage } from '@/lib/LanguageContext';
import { t, isRTL } from '@/lib/translations';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

interface Suggestion {
  id: string;
  name: string;
  price: number;
  reason: string;
  emoji: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
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

export default function Bestellboard({
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
  const { locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsFetched, setSuggestionsFetched] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [showWaiterOptions, setShowWaiterOptions] = useState(false);
  const [newItemFlash, setNewItemFlash] = useState<string | null>(null);
  const prevItemCount = useRef(0);

  const currentSeat = summary?.seats.find((s) => s.id === currentSeatId);
  const myItems: OrderItem[] = (currentSeat?.items as OrderItem[]) || [];
  const myTotal = currentSeat?.seat_total || 0;
  const groupTotal = summary?.grandTotal || 0;
  const showPayButton = sessionType === 'individual' || isHost;
  const hasOrders = myItems.length > 0;
  const estimatedWait = hasOrders ? Math.max(10, Math.ceil(myItems.length * 1.5) * 5) : 0;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  // Detect new items and flash
  useEffect(() => {
    const currentCount = myItems.length;
    if (currentCount > prevItemCount.current && prevItemCount.current > 0) {
      const newest = myItems[myItems.length - 1];
      if (newest) {
        setNewItemFlash(newest.name);
        setTimeout(() => setNewItemFlash(null), 3000);
      }
    }
    prevItemCount.current = currentCount;
  }, [myItems.length]);

  // Reset fetched flag when item count changes so new orders trigger fresh suggestions
  useEffect(() => {
    setSuggestionsFetched(false);
  }, [myItems.length]);

  // Fetch AI suggestions — single clean effect with fetched guard
  useEffect(() => {
    if (myItems.length === 0) {
      setSuggestions([]);
      setSuggestionsFetched(false);
      return;
    }

    if (suggestionsFetched) return;
    if (!restaurantId || restaurantId === '') return;

    let cancelled = false;

    async function fetchSuggestions() {
      setLoadingSuggestions(true);
      console.log('[Bestellboard] calling /api/ai-suggest with', myItems.length, 'items, restaurantId:', restaurantId);

      try {
        const res = await fetch('/api/ai-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderedItems: myItems,
            restaurantId,
            sessionId: summary?.sessionId || '',
          }),
        });

        console.log('[Bestellboard] ai-suggest response status:', res.status);
        const data = await res.json();
        console.log('[Bestellboard] ai-suggest data:', JSON.stringify(data));

        if (!cancelled) {
          setSuggestions(data.suggestions || []);
          setSuggestionsFetched(true);
        }
      } catch (err) {
        console.error('[Bestellboard] ai-suggest error:', err);
        if (!cancelled) {
          setSuggestions([]);
          setSuggestionsFetched(true);
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }

    fetchSuggestions();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myItems.length, restaurantId, suggestionsFetched]);

  async function callWaiter(reason: string) {
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
      onCallWaiter(reason);
    } catch {
      alert('Could not call waiter.');
    } finally {
      setCallingWaiter(false);
    }
  }

  function handleAddSuggestion(s: Suggestion) {
    onAddItem({ id: s.id, name: s.name, price: s.price, quantity: 1 });
    setAddedItems((prev) => new Set([...prev, s.id]));
    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }, 2000);
  }

  if (!hasOrders) return null;

  const displayTotal = sessionType === 'group' && isHost ? groupTotal : myTotal;

  return (
    <>
      {/* New item flash notification */}
      {newItemFlash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-bounce">
          ✓ {newItemFlash} added!
        </div>
      )}

      {/* Waiter options popup */}
      {showWaiterOptions && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg">
            <p className="font-bold text-gray-800 mb-3 text-center">Why do you need the waiter?</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: '🍽️ Ready to order more', value: 'Ready to order more' },
                { label: '💧 Need water', value: 'Needs water' },
                { label: '🧹 Clean table', value: 'Table needs cleaning' },
                { label: '❓ Have a question', value: 'Has a question' },
                { label: '🚨 Urgent help', value: 'Urgent assistance needed' },
                { label: '🍴 Need cutlery', value: 'Needs cutlery' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => callWaiter(opt.value)}
                  className="border border-gray-200 rounded-xl py-3 px-3 text-sm text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-colors text-left"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowWaiterOptions(false)} className="w-full text-sm text-gray-400 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Bestellboard */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto">

          {/* Collapsed bar */}
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 flex items-center justify-between shadow-2xl"
              style={{ borderRadius: '16px 16px 0 0' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-xs text-gray-400 font-medium">
                    {myItems.length} item{myItems.length > 1 ? 's' : ''} · ~{estimatedWait} {t(locale, 'minRemaining')}
                  </span>
                </div>
                {suggestions.length > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    💡 {suggestions.length} suggestions
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-orange-400">{formatPrice(displayTotal)}</span>
                <span className="text-gray-400 text-xs">▲ tap</span>
              </div>
            </button>
          )}

          {/* Expanded panel */}
          {expanded && (
            <div
              className="bg-gray-900 text-white shadow-2xl overflow-hidden"
              style={{ borderRadius: '20px 20px 0 0', maxHeight: '80vh', overflowY: 'auto' }}
              dir={isRTL(locale) ? 'rtl' : 'ltr'}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="font-black text-lg text-white">
                    {sessionType === 'group' && isHost ? '👑 Group Bill' : `🍽️ ${t(locale, 'yourOrder')}`}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Table {tableNumber} · ~{estimatedWait} {t(locale, 'minRemaining')}
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-gray-400 text-2xl w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="px-4 pb-4 space-y-3">

                {/* Individual orders */}
                {sessionType === 'individual' && (
                  <div className="bg-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{seatEmoji[currentSeatCode] || '🪑'}</span>
                        <span className="font-bold text-sm">{currentSeatCode}</span>
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">You</span>
                      </div>
                      <span className="font-black text-orange-400">{formatPrice(myTotal)}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {myItems.map((item: OrderItem) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 text-xs">✓</span>
                            <span className="text-sm text-gray-200">
                              {item.quantity > 1 && (
                                <span className="text-orange-400 font-bold">{item.quantity}× </span>
                              )}
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group orders — all seats */}
                {sessionType === 'group' && summary && (
                  <div className="space-y-2">
                    {summary.seats.map((seat: SeatSummary) => {
                      const seatItems = (seat.items as OrderItem[]) || [];
                      const isCurrentSeat = seat.id === currentSeatId;
                      return (
                        <div
                          key={seat.id}
                          className={`rounded-2xl overflow-hidden transition-all ${
                            isCurrentSeat ? 'bg-gray-700 ring-1 ring-orange-500' : 'bg-gray-800'
                          }`}
                        >
                          <div className="px-4 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{seatEmoji[seat.seat_code as string] || '🪑'}</span>
                              <span className="font-bold text-sm text-white">{seat.seat_code as string}</span>
                              {isCurrentSeat && (
                                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">You</span>
                              )}
                              {seat.id === summary.hostSeatId && (
                                <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full">Host</span>
                              )}
                            </div>
                            <span className={`font-black text-sm ${isCurrentSeat ? 'text-orange-400' : 'text-gray-300'}`}>
                              {formatPrice(seat.seat_total)}
                            </span>
                          </div>
                          {seatItems.length > 0 ? (
                            <div className="px-4 pb-3 space-y-1.5">
                              {seatItems.map((item: OrderItem) => (
                                <div key={item.id} className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400 text-xs">✓</span>
                                    <span className="text-xs text-gray-300">
                                      {item.quantity > 1 && (
                                        <span className="text-orange-400 font-semibold">{item.quantity}× </span>
                                      )}
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">{formatPrice(item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 pb-3">
                              <p className="text-xs text-gray-500 italic">No orders yet</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Total */}
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl px-4 py-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-orange-200 font-medium">
                      {sessionType === 'group' && isHost ? 'Group Total' : t(locale, 'myBill')}
                    </p>
                    <p className="text-2xl font-black text-white">{formatPrice(displayTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-orange-200">⏱️ ~{estimatedWait} min</p>
                    {sessionType === 'group' && summary && (
                      <p className="text-xs text-orange-200 mt-0.5">
                        {summary.seats.length} seat{summary.seats.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Suggestions */}
                {(suggestions.length > 0 || loadingSuggestions) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">✨</span>
                      <p className="text-sm font-bold text-white">{t(locale, 'chefRecommends')}</p>
                      {loadingSuggestions && (
                        <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleAddSuggestion(s)}
                          disabled={addedItems.has(s.id)}
                          className={`rounded-xl p-3 text-left transition-all ${
                            addedItems.has(s.id)
                              ? 'bg-green-800 border border-green-600'
                              : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-orange-500'
                          }`}
                        >
                          <p className="text-xl mb-1">{s.emoji}</p>
                          <p className="text-xs font-bold text-white leading-tight">{s.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.reason}</p>
                          <p className="text-xs font-black text-orange-400 mt-1">{formatPrice(s.price)}</p>
                          {addedItems.has(s.id) ? (
                            <p className="text-xs text-green-400 mt-1 font-semibold">✓ Added!</p>
                          ) : (
                            <p className="text-xs text-orange-400 mt-1 font-semibold">{t(locale, 'addToOrder')}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {waiterCalled ? (
                    <div className="col-span-2 bg-green-800 border border-green-600 rounded-xl py-3 text-center">
                      <p className="text-sm font-semibold text-green-300">✓ Waiter on the way!</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowWaiterOptions(true)}
                      disabled={callingWaiter}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl py-3 text-sm font-semibold text-gray-300 transition-colors"
                    >
                      🔔 {t(locale, 'callWaiter')}
                    </button>
                  )}

                  {showPayButton && (
                    <button
                      onClick={() => {
                        setExpanded(false);
                        onCheckout();
                      }}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl py-3 text-sm font-bold text-white transition-all shadow-lg"
                    >
                      💳 Pay {formatPrice(displayTotal)}
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
