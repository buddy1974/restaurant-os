'use client';

import React, { useEffect, useState } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/hooks/useCart';

interface TableData {
  id: string;
  number: number;
  label: string;
  status: string;
  restaurant_id: string;
  restaurant_name: string;
  slug: string;
  primary_color: string;
  currency: string;
}

interface SessionData {
  id: string;
  table_id: string;
  restaurant_id: string;
  status: string;
}

export default function MenuPage({
  params,
}: {
  params: Promise<{ slug: string; tableNumber: string }>;
}) {
  const { slug, tableNumber } = React.use(params);
  const [table, setTable] = useState<TableData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
  const [seat, setSeat] = useState<{ id: string; seat_code: string } | null>(null);

  const seatEmoji: Record<string, string> = {
    APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
    STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
    CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
    PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
    BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
  };

  const { categories, items, loading: menuLoading } = useMenu(
    table?.restaurant_id || null
  );
  const { cart, addItem, removeItem, updateQuantity, clearCart, total, itemCount } =
    useCart(session?.id || null);

  // Step 1 — load table
  useEffect(() => {
    async function loadTable() {
      try {
        const res = await fetch(
          `/api/tables?slug=${slug}&number=${tableNumber}`
        );
        if (!res.ok) throw new Error('Table not found');
        const data = await res.json();
        setTable(data.table);
      } catch {
        setError('Table not found. Please scan the QR code again.');
      } finally {
        setLoadingTable(false);
      }
    }
    loadTable();
  }, [slug, tableNumber]);

  // Step 2 — create or resume session + assign seat
  useEffect(() => {
    if (!table) return;

    async function loadSession() {
      try {
        // Always get fresh session from server
        const res = await fetch(`/api/sessions?tableId=${table!.id}`);
        const data = await res.json();

        let activeSession = data.session;

        if (!activeSession) {
          const createRes = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableId: table!.id,
              restaurantId: table!.restaurant_id,
            }),
          });
          const createData = await createRes.json();
          activeSession = createData.session;
        }

        setSession(activeSession);

        // Check if stored seat belongs to this active session
        const storedSeatRaw = localStorage.getItem(`seat_${table!.id}`);
        if (storedSeatRaw) {
          const parsedSeat = JSON.parse(storedSeatRaw);
          // Validate seat belongs to current active session
          if (parsedSeat.session_id === activeSession.id) {
            setSeat(parsedSeat);
            return;
          } else {
            // Stale seat from old session — clear it
            localStorage.removeItem(`seat_${table!.id}`);
          }
        }

        // Assign new seat
        const seatRes = await fetch('/api/seats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSession.id }),
        });
        const seatData = await seatRes.json();
        if (seatData.seat) {
          const seatWithSession = { ...seatData.seat, session_id: activeSession.id };
          setSeat(seatWithSession);
          localStorage.setItem(`seat_${table!.id}`, JSON.stringify(seatWithSession));
        }
      } catch {
        setError('Could not start session. Please try again.');
      }
    }

    loadSession();
  }, [table]);

  // Set first category as active
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  async function placeOrder() {
    if (!session || cart.length === 0 || !paymentMethod) return;
    setOrdering(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          restaurantId: table!.restaurant_id,
          items: cart,
          paymentMethod,
          seatId: seat?.id,
        }),
      });
      if (!res.ok) throw new Error('Order failed');
      clearCart();
      setShowCart(false);
      setCheckoutStep('cart');
      setPaymentMethod(null);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch {
      alert('Could not place order. Please try again.');
    } finally {
      setOrdering(false);
    }
  }

  const filteredItems = items.filter((i) => i.category_id === activeCategory);
  const currency = table?.currency || 'EUR';
  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(p);

  if (loadingTable || menuLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 text-lg">Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {table?.restaurant_name}
            </h1>
            <p className="text-sm text-gray-500">{table?.label}</p>
          </div>
          <div className="flex items-center gap-3">
            {seat && (
              <div className="text-center bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5">
                <p className="text-xs text-orange-400 font-medium leading-none">Your seat</p>
                <p className="text-sm font-bold text-orange-600 leading-tight">
                  {seatEmoji[seat.seat_code] || '🪑'} {seat.seat_code}
                </p>
              </div>
            )}
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

      {/* Order success banner */}
      {orderSuccess && (
        <div className="bg-green-500 text-white text-center py-3 text-sm font-medium">
          ✓ Order placed successfully!
        </div>
      )}

      {/* Menu items */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {filteredItems.map((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-start"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  {item.is_popular && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                )}
                <p className="text-orange-500 font-semibold mt-2">
                  {formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {cartItem ? (
                  <>
                    <button
                      onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-4 text-center font-medium">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                      className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                    className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">

            {checkoutStep === 'cart' && (
              <>
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
                            <p className="text-sm text-gray-500">
                              {formatPrice(item.price)} × {item.quantity}
                            </p>
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

                    <button
                      onClick={() => setCheckoutStep('payment')}
                      className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg"
                    >
                      Continue to Payment
                    </button>
                  </>
                )}
              </>
            )}

            {checkoutStep === 'payment' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => setCheckoutStep('cart')}
                    className="text-gray-400 text-sm"
                  >← Back</button>
                  <h2 className="text-lg font-bold">How do you want to pay?</h2>
                  <button onClick={() => setShowCart(false)} className="text-gray-400 text-2xl">✕</button>
                </div>

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
                      <p className="text-sm text-gray-500">A waiter will come to your table</p>
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
                      <p className="text-sm text-gray-500">Pay securely by card</p>
                    </div>
                  </button>
                </div>

                <div className="border-t pt-4 mb-4 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={!paymentMethod || ordering}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-40"
                >
                  {ordering ? 'Placing order...' : 'Place Order'}
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
