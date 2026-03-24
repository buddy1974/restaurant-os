'use client';

import React, { useEffect, useState } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/hooks/useCart';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import OrderStatusPanel from '@/components/customer/OrderStatusPanel';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

export default function GuestMenuPage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string; seatId: string }>;
}) {
  const { slug, sessionId, seatId } = React.use(params);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState(0);
  const [seatCode, setSeatCode] = useState<string | null>(null);
  const [hostSeatCode, setHostSeatCode] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { summary, refetch: refetchSummary } = useSessionSummary(sessionId);
  const { categories, items, loading: menuLoading } = useMenu(restaurantId);
  const { cart, addItem, updateQuantity, clearCart, total, itemCount } = useCart(seatId);

  // Get restaurant_id via slug
  useEffect(() => {
    async function loadRestaurantId() {
      try {
        const res = await fetch(`/api/staff/tables?slug=${slug}`);
        const data = await res.json();
        if (data.tables?.length > 0) {
          setRestaurantId((data.tables[0] as { restaurant_id: string }).restaurant_id);
        }
      } catch (err) {
        console.error('Failed to get restaurant id', err);
      }
    }
    loadRestaurantId();
  }, [slug]);

  // Get actual table number for waiter call
  useEffect(() => {
    async function getTableNumber() {
      try {
        const res = await fetch(`/api/staff/tables?slug=${slug}`);
        const data = await res.json();
        if (data.tables) {
          const activeTable = data.tables.find(
            (t: { session_id: string }) => t.session_id === sessionId
          );
          if (activeTable) setTableNumber((activeTable as { number: number }).number);
        }
      } catch (err) {
        console.error('Failed to get table number', err);
      }
    }
    getTableNumber();
  }, [slug, sessionId]);

  // Auto-refresh summary every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchSummary();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetchSummary]);

  // Derive seat code and host from summary
  useEffect(() => {
    if (!summary) return;
    const mySeat = summary.seats.find((s) => s.id === seatId);
    if (mySeat) setSeatCode(mySeat.seat_code as string);
    const hostSeat = summary.seats.find((s) => s.id === summary.hostSeatId);
    if (hostSeat) setHostSeatCode(hostSeat.seat_code as string);
  }, [summary, seatId]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  async function placeOrder() {
    if (!restaurantId || cart.length === 0) return;
    setOrdering(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          restaurantId,
          items: cart,
          seatId,
        }),
      });
      if (!res.ok) throw new Error('Order failed');
      clearCart();
      setShowCart(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch {
      alert('Could not place order. Please try again.');
    } finally {
      setOrdering(false);
    }
  }

  const filteredItems = items.filter((i) => i.category_id === activeCategory);
  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(p);

  const mySeatSummary = summary?.seats.find((s) => s.id === seatId);
  const myTotal = mySeatSummary?.seat_total || 0;

  if (!restaurantId || menuLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-xs text-gray-400">Ordering as guest</p>
              <p className="text-sm font-bold text-gray-700">
                {seatCode ? `${seatEmoji[seatCode] || '🪑'} ${seatCode}` : '...'}
              </p>
            </div>
            <div className="text-right mr-3">
              {hostSeatCode && (
                <p className="text-xs text-gray-400">
                  Bill goes to {seatEmoji[hostSeatCode] || '👑'} <strong>{hostSeatCode}</strong>
                </p>
              )}
              {myTotal > 0 && (
                <p className="text-xs text-orange-500 font-semibold">
                  Your orders: {formatPrice(myTotal)}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Guest notice banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-600 text-center">
            👑 You are a guest — {hostSeatCode ? `${hostSeatCode} will pay the bill` : 'Host will pay the bill'}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex overflow-x-auto gap-2 px-4 pb-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Order success */}
      {orderSuccess && (
        <div className="bg-green-500 text-white text-center py-3 text-sm font-medium">
          ✓ Order sent to {hostSeatCode ? `${hostSeatCode}'s bill` : 'host'}!
        </div>
      )}

      {/* Menu items */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-32 space-y-3">
        {filteredItems.map((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-start">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  {item.is_popular && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Popular</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                )}
                <p className="text-orange-500 font-semibold mt-2">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                {cartItem ? (
                  <>
                    <button
                      onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center"
                    >−</button>
                    <span className="w-4 text-center font-medium">{cartItem.quantity}</span>
                    <button
                      onClick={() => addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                      className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center"
                    >+</button>
                  </>
                ) : (
                  <button
                    onClick={() => addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                    className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center"
                  >+</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order status panel — call waiter only, no pay button for guests */}
      {seatCode && restaurantId && (
        <OrderStatusPanel
          summary={summary}
          currentSeatId={seatId}
          currentSeatCode={seatCode}
          tableNumber={tableNumber}
          restaurantId={restaurantId}
          sessionType="group"
          isHost={false}
          onAddItem={(item) => addItem(item)}
          onCheckout={() => {}}
          onCallWaiter={() => {}}
        />
      )}

      {/* Cart drawer — no checkout button for guests */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 text-2xl">✕</button>
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Your cart is empty.</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                        >−</button>
                        <span className="w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mb-4 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center text-sm text-blue-600 mb-4">
                  👑 {hostSeatCode ? `${hostSeatCode} will pay for this table` : 'Host will pay for this table'}
                </div>

                <button
                  onClick={placeOrder}
                  disabled={ordering}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
                >
                  {ordering ? 'Sending order...' : 'Send to kitchen'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
