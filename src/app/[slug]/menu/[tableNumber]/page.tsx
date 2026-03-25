'use client';

import React, { useEffect, useState } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/hooks/useCart';
import PaymentModal from '@/components/customer/PaymentModal';
import GroupBillModal from '@/components/customer/GroupBillModal';
import SessionSetup from '@/components/customer/SessionSetup';
import JoiningGroup from '@/components/customer/JoiningGroup';
import Bestellboard from '@/components/customer/Bestellboard';
import ReceiptModal from '@/components/customer/ReceiptModal';
import GroupQRCode from '@/components/customer/GroupQRCode';
import { useSessionSummary } from '@/hooks/useSessionSummary';

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
  session_type: 'individual' | 'group';
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
  const [seat, setSeat] = useState<{ id: string; seat_code: string } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGroupBill, setShowGroupBill] = useState(false);
  const [sessionType, setSessionType] = useState<'individual' | 'group' | null>(null);
  const [settingUpSession, setSettingUpSession] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showJoiningScreen, setShowJoiningScreen] = useState(false);
  const [hostSeatCode, setHostSeatCode] = useState<string | null>(null);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [showGroupCode, setShowGroupCode] = useState(false);
  const [receipt, setReceipt] = useState<{
    receipt_number: string;
    restaurant_name: string;
    table_number: number;
    seat_code?: string;
    payment_method: string;
    payment_mode: string;
    subtotal: string;
    vat_amount: string;
    total: string;
    items: { name: string; price: number; quantity: number }[];
    issued_at: string;
  } | null>(null);

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
  const { summary, refetch: refetchSummary } = useSessionSummary(session?.id || null);
  const isHost = summary ? seat?.id === summary.hostSeatId : false;
  const currentSeatData = summary?.seats.find((s) => s.id === seat?.id);
  const alreadyPaid = currentSeatData?.paid || false;
  const allPaid = summary ? summary.seats.every((s) => s.paid) : false;
  const paidBySeat = allPaid && summary ? summary.seats.find((s) => s.paid) : null;

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
        const res = await fetch(`/api/sessions?tableId=${table!.id}`);
        const data = await res.json();

        if (data.session) {
          const activeSession = data.session;
          setSession(activeSession);
          setSessionType(activeSession.session_type);

          const storedSeatRaw = localStorage.getItem(`seat_${table!.id}`);
          if (storedSeatRaw) {
            const parsedSeat = JSON.parse(storedSeatRaw);
            if (parsedSeat.session_id === activeSession.id) {
              setSeat(parsedSeat);
              return;
            } else {
              localStorage.removeItem(`seat_${table!.id}`);
            }
          }

          const seatRes = await fetch('/api/seats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: activeSession.id, isGuest: false }),
          });
          const seatData = await seatRes.json();
          if (seatData.seat) {
            const seatWithSession = { ...seatData.seat, session_id: activeSession.id };
            setSeat(seatWithSession);
            localStorage.setItem(`seat_${table!.id}`, JSON.stringify(seatWithSession));

            const summaryRes = await fetch(`/api/sessions/summary?sessionId=${activeSession.id}`);
            const summaryData = await summaryRes.json();
            const hostSeat = summaryData.seats?.find((s: { id: string }) => s.id === summaryData.hostSeatId);
            if (hostSeat && activeSession.session_type === 'group') {
              setHostSeatCode(hostSeat.seat_code);
              setShowJoiningScreen(true);
            }
          }
        } else {
          setNeedsSetup(true);
        }
      } catch {
        setError('Could not start session. Please try again.');
      }
    }

    loadSession();
  }, [table]);

  // Debug: log table load
  useEffect(() => {
    if (table) {
      console.log('[MenuPage] table loaded:', table.number, table.restaurant_id);
    }
  }, [table]);

  // Auto-refresh summary every 15 seconds
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      refetchSummary();
    }, 15000);
    return () => clearInterval(interval);
  }, [session, refetchSummary]);

  // Load group code from localStorage for host
  useEffect(() => {
    if (table && sessionType === 'group') {
      const stored = localStorage.getItem(`group_code_${table.id}`);
      if (stored) setGroupCode(stored);
    }
  }, [table, sessionType]);

  async function handleSessionSetup(type: 'individual' | 'group') {
    if (!table) return;
    setSettingUpSession(true);
    try {
      const createRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          restaurantId: table.restaurant_id,
          sessionType: type,
        }),
      });
      const createData = await createRes.json();
      const activeSession = createData.session;
      setSession(activeSession);
      setSessionType(type);
      setNeedsSetup(false);

      // Assign seat
      const seatRes = await fetch('/api/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, isGuest: false }),
      });
      const seatData = await seatRes.json();

      if (seatData.seat) {
        const seatWithSession = { ...seatData.seat, session_id: activeSession.id };
        setSeat(seatWithSession);
        localStorage.setItem(`seat_${table.id}`, JSON.stringify(seatWithSession));

        // If group host, generate and store group code
        if (type === 'group') {
          const code = `T${table.number}-${seatData.seat.seat_code}`;
          const patchRes = await fetch('/api/sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSession.id,
              groupCode: code,
            }),
          });
          const patchData = await patchRes.json();
          console.log('Group code PATCH response:', patchData);
          console.log('Group code saved:', code, 'for session:', activeSession.id);
          setGroupCode(code);
          localStorage.setItem(`group_code_${table.id}`, code);
          const storedCode = localStorage.getItem(`group_code_${table.id}`);
          console.log('Stored group code in localStorage:', storedCode);
        }
      }
    } catch {
      setError('Could not start session. Please try again.');
    } finally {
      setSettingUpSession(false);
    }
  }

  async function generateReceipt(
    paymentMethod: string,
    paymentMode: string,
    items: { name: string; price: number; quantity: number }[]
  ) {
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          seatId: seat?.id,
          restaurantId: table?.restaurant_id,
          tableNumber: table?.number,
          seatCode: seat?.seat_code,
          paymentMethod,
          paymentMode,
          items,
        }),
      });
      const data = await res.json();
      if (data.receipt) {
        setReceipt(data.receipt);
      }
    } catch (err) {
      console.error('Failed to generate receipt', err);
    }
  }

  // Set first category as active
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const filteredItems = items.filter((i) => i.category_id === activeCategory);
  const currency = table?.currency || 'EUR';
  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(p);

  if (showJoiningScreen && table && seat && hostSeatCode) {
    return (
      <JoiningGroup
        restaurantName={table.restaurant_name}
        tableLabel={table.label || `Table ${table.number}`}
        hostSeatCode={hostSeatCode}
        yourSeatCode={seat.seat_code}
        isHost={summary ? seat.id === summary.hostSeatId : seat.seat_code === hostSeatCode}
        onContinue={() => setShowJoiningScreen(false)}
      />
    );
  }

  if (needsSetup && table) {
    return (
      <SessionSetup
        tableLabel={table.label || `Table ${table.number}`}
        restaurantName={table.restaurant_name}
        onSelectIndividual={() => handleSessionSetup('individual')}
        onSelectHost={() => handleSessionSetup('group')}
        loading={settingUpSession}
      />
    );
  }

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
            {sessionType === 'group' && isHost && groupCode && (
              <button
                onClick={() => setShowGroupCode(true)}
                className="bg-blue-500 text-white px-3 py-2 rounded-full text-xs font-medium"
              >
                👥 Group Code
              </button>
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
        <div className="bg-green-500 text-white text-center py-3 text-sm font-semibold fixed top-0 left-0 right-0 z-50">
          ✅ Payment confirmed! Thank you — enjoy your meal 🍽️
        </div>
      )}

      {/* Menu items */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-32 space-y-3">
        {filteredItems.map((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Item image */}
              {item.image_url && (
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {item.is_popular && (
                    <span className="absolute top-2 left-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                      ⭐ Popular
                    </span>
                  )}
                </div>
              )}

              <div className="p-4 flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    {item.is_popular && !item.image_url && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                  <p className="text-orange-500 font-semibold mt-2">{formatPrice(item.price)}</p>
                </div>

                <div className="flex items-center gap-2 mt-1">
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
            </div>
          );
        })}
      </div>

      {/* Cart drawer */}
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
                  onClick={async () => {
                    if (!session || cart.length === 0) return;
                    setOrdering(true);
                    try {
                      // Verify session is still active
                      const sessionCheck = await fetch(`/api/sessions?tableId=${table!.id}`);
                      const sessionData = await sessionCheck.json();
                      if (!sessionData.session || sessionData.session.id !== session.id) {
                        localStorage.removeItem(`seat_${table!.id}`);
                        window.location.reload();
                        return;
                      }

                      const res = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sessionId: session.id,
                          restaurantId: table!.restaurant_id,
                          items: cart,
                          seatId: seat?.id,
                        }),
                      });
                      if (!res.ok) throw new Error('Order failed');
                      clearCart();
                      setShowCart(false);
                      setOrderSuccess(true);
                      await refetchSummary();
                      setTimeout(() => setOrderSuccess(false), 4000);
                    } catch {
                      alert('Could not place order. Please try again.');
                    } finally {
                      setOrdering(false);
                    }
                  }}
                  disabled={ordering}
                  className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold text-base mb-3 disabled:opacity-40"
                >
                  {ordering ? 'Placing...' : 'Place Order'}
                </button>

                {sessionType === 'group' && isHost ? (
                  <button
                    onClick={() => {
                      setShowCart(false);
                      refetchSummary();
                      setShowGroupBill(true);
                    }}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg mt-2"
                  >
                    👑 View Group Bill
                  </button>
                ) : sessionType === 'individual' ? (
                  <button
                    onClick={() => {
                      setShowCart(false);
                      refetchSummary();
                      setShowPaymentModal(true);
                    }}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg mt-2"
                  >
                    Checkout & Pay
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {/* Group QR code modal */}
      {showGroupCode && groupCode && (
        <GroupQRCode
          groupCode={groupCode}
          slug={slug}
          onClose={() => setShowGroupCode(false)}
        />
      )}

      {showPaymentModal && summary && seat && (
        <PaymentModal
          summary={summary}
          currentSeatId={seat.id}
          currentSeatCode={seat.seat_code}
          sessionType={sessionType || 'individual'}
          isHost={isHost}
          paymentLockedBy={summary.paymentLockedBy}
          sessionId={summary.sessionId}
          tableNumber={table?.number || 0}
          alreadyPaid={alreadyPaid}
          paidByCode={paidBySeat?.seat_code as string | undefined}
          onTransferHost={async (newHostSeatId) => {
            await fetch('/api/sessions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: summary.sessionId, newHostSeatId }),
            });
            setShowPaymentModal(false);
            await refetchSummary();
          }}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={async (paymentMethod, paymentMode) => {
            setShowPaymentModal(false);
            if (session?.id) localStorage.removeItem(`cart_${session.id}`);
            clearCart();
            setOrderSuccess(true);
            // Capture items before refetch
            const seatData = summary?.seats.find((s) => s.id === seat?.id);
            const seatItems = (seatData?.items || []).map((i) => ({
              name: i.name, price: i.price, quantity: i.quantity,
            }));
            const allItems = (summary?.seats.flatMap((s) =>
              s.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }))
            ) || []);
            const receiptItems = paymentMode === 'unit' ? seatItems : allItems;
            await generateReceipt(paymentMethod, paymentMode, receiptItems);
            refetchSummary();
            setTimeout(() => setOrderSuccess(false), 6000);
          }}
        />
      )}

      {session && seat && table && (
        <Bestellboard
          summary={summary}
          currentSeatId={seat.id}
          currentSeatCode={seat.seat_code}
          tableNumber={table.number}
          restaurantId={table.restaurant_id}
          sessionType={sessionType || 'individual'}
          isHost={isHost}
          onAddItem={(item) => addItem(item)}
          onCheckout={() => {
            refetchSummary();
            if (sessionType === 'group' && isHost) {
              setShowGroupBill(true);
            } else {
              setShowPaymentModal(true);
            }
          }}
          onCallWaiter={() => {}}
        />
      )}

      {showGroupBill && summary && seat && (
        <GroupBillModal
          summary={summary}
          hostSeatCode={seat.seat_code}
          sessionId={session!.id}
          tableNumber={table?.number || 0}
          onClose={() => setShowGroupBill(false)}
          onSuccess={async (paymentMethod) => {
            setShowGroupBill(false);
            if (session?.id) localStorage.removeItem(`cart_${session.id}`);
            clearCart();
            setOrderSuccess(true);
            // Capture all seat items before refetch
            const allItems = (summary?.seats.flatMap((s) =>
              s.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }))
            ) || []);
            await generateReceipt(paymentMethod, 'group', allItems);
            refetchSummary();
            setTimeout(() => setOrderSuccess(false), 6000);
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}

      <div className="text-center py-6 pb-32">
        <a
          href="https://maxpromo.digital"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-300 hover:text-orange-400 transition-colors"
        >
          Powered by maxpromo.digital
        </a>
      </div>
    </div>
  );
}
