'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';
import LanguagePicker from '@/components/customer/LanguagePicker';
import { t, Locale } from '@/lib/translations';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-500',
  preparing: 'bg-yellow-500',
  ready: 'bg-green-500',
  served: 'bg-gray-500',
};

const NEXT_STATUS: Record<string, string> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

interface KitchenItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
}

interface KitchenOrder {
  orderId: string;
  tableNumber: number;
  tableLabel: string;
  seatCode: string;
  createdAt: string;
  orderKitchenStatus: string;
  items: KitchenItem[];
}

function KitchenDisplay({ slug }: { slug: string }) {
  const { locale } = useLanguage();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const statusLabels: Record<string, string> = {
    new: t(locale as Locale, 'statusNew'),
    preparing: t(locale as Locale, 'statusPreparing'),
    ready: t(locale as Locale, 'statusReady'),
    served: t(locale as Locale, 'statusServed'),
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/kitchen/orders?slug=${slug}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch kitchen orders', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateItemStatus(itemId: string, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    await fetch('/api/kitchen/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, status: next }),
    });
    fetchOrders();
  }

  async function markOrderReady(orderId: string) {
    await fetch('/api/kitchen/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: 'ready' }),
    });
    // Mark all items ready
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      await Promise.all(
        order.items
          .filter(i => i.status !== 'served')
          .map(i => fetch('/api/kitchen/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: i.id, status: 'ready' }),
          }))
      );
    }
    fetchOrders();
  }

  function getElapsed(createdAt: string) {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
    if (diff < 1) return t(locale as Locale, 'justNow');
    return `${diff} ${t(locale as Locale, 'minAgo')}`;
  }

  const newOrders = orders.filter(o => o.items.some(i => i.status === 'new'));
  const preparingOrders = orders.filter(o => o.items.some(i => i.status === 'preparing') && !o.items.some(i => i.status === 'new'));
  const readyOrders = orders.filter(o => o.items.every(i => i.status === 'ready' || i.status === 'served'));

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white text-xl">{t(locale as Locale, 'loadingKitchen')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-3 md:p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black tracking-wider uppercase">{t(locale as Locale, 'kitchenDisplay')}</h1>
          <LanguagePicker />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-xs">Auto-refreshes · {lastUpdated.toLocaleTimeString()}</p>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/><span>{t(locale as Locale, 'statusNew')} ({newOrders.length})</span></div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/><span>Prep ({preparingOrders.length})</span></div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/><span>{t(locale as Locale, 'statusReady')} ({readyOrders.length})</span></div>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-5xl mb-4">🧑‍🍳</p>
          <p className="text-xl font-semibold">{t(locale as Locale, 'allClear')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const allReady = order.items.every(i => i.status === 'ready' || i.status === 'served');
            const hasNew = order.items.some(i => i.status === 'new');
            const borderColor = allReady ? 'border-green-500' : hasNew ? 'border-red-500' : 'border-yellow-500';

            return (
              <div key={order.orderId} className={`bg-gray-900 rounded-2xl border-2 ${borderColor} p-4`}>
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">T{order.tableNumber}</span>
                    <span className="text-lg">{seatEmoji[order.seatCode] || '👤'}</span>
                    <span className="text-sm font-bold text-gray-300">{order.seatCode}</span>
                  </div>
                  <span className="text-xs text-gray-400">{getElapsed(order.createdAt)}</span>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {order.items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => updateItemStatus(item.id, item.status)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-all hover:opacity-80 ${
                        item.status === 'new' ? 'bg-red-900/50 border border-red-700' :
                        item.status === 'preparing' ? 'bg-yellow-900/50 border border-yellow-700' :
                        item.status === 'ready' ? 'bg-green-900/50 border border-green-700' :
                        'bg-gray-800 border border-gray-700 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-500'}`}/>
                        <span className="font-bold text-sm">{item.quantity}×</span>
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        item.status === 'new' ? 'bg-red-500 text-white' :
                        item.status === 'preparing' ? 'bg-yellow-500 text-black' :
                        item.status === 'ready' ? 'bg-green-500 text-white' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {statusLabels[item.status] || item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mark All Ready button */}
                {!allReady && (
                  <button
                    onClick={() => markOrderReady(order.orderId)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl text-sm transition-all"
                  >
                    ✅ {t(locale as Locale, 'markAllReady')}
                  </button>
                )}
                {allReady && (
                  <div className="w-full bg-green-900/50 border border-green-600 text-green-400 font-bold py-2 rounded-xl text-sm text-center">
                    ✅ {t(locale as Locale, 'readyForPickup')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KitchenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  return (
    <LanguageProvider>
      <KitchenDisplay slug={slug} />
    </LanguageProvider>
  );
}
