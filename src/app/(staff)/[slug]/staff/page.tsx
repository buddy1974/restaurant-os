'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface TableRow {
  id: string;
  number: number;
  label: string;
  status: string;
  restaurant_id: string;
  session_id: string | null;
  session_status: string | null;
  started_at: string | null;
  order_count: number;
  session_total: number;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface Order {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export default function StaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableRow | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/tables?slug=${slug}`);
      const data = await res.json();
      setTables(data.tables || []);
    } catch (err) {
      console.error('Failed to fetch tables', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  async function fetchOrders(sessionId: string) {
    try {
      const res = await fetch(`/api/staff/orders?sessionId=${sessionId}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  }

  function selectTable(table: TableRow) {
    setSelectedTable(table);
    if (table.session_id) {
      fetchOrders(table.session_id);
    } else {
      setOrders([]);
    }
  }

  async function handleAction(action: 'mark_paid' | 'close_table', orderId?: string) {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      await fetch('/api/staff/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          orderId,
          sessionId: selectedTable.session_id,
          tableId: selectedTable.id,
        }),
      });
      await fetchTables();
      if (selectedTable.session_id) {
        await fetchOrders(selectedTable.session_id);
      }
      if (action === 'close_table') {
        setSelectedTable(null);
        setOrders([]);
      }
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      setActionLoading(false);
    }
  }

  function statusColor(status: string) {
    switch (status) {
      case 'free': return 'bg-green-100 text-green-700 border-green-200';
      case 'occupied': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'waiting_payment': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'free': return 'Free';
      case 'occupied': return 'Occupied';
      case 'waiting_payment': return 'Wants to Pay';
      default: return status;
    }
  }

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  const formatTime = (t: string) =>
    new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Staff Dashboard</h1>
        <span className="text-sm text-gray-400 uppercase tracking-wide">{slug}</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">

        {/* Table Grid */}
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Tables
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => selectTable(table)}
                className={`border-2 rounded-xl p-4 text-left transition-all ${
                  selectedTable?.id === table.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                }`}
              >
                <p className="font-bold text-gray-900 text-lg">Table {table.number}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-1 ${statusColor(table.status)}`}>
                  {statusLabel(table.status)}
                </span>
                {table.order_count > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {table.order_count} order{Number(table.order_count) > 1 ? 's' : ''} · {formatPrice(table.session_total)}
                  </p>
                )}
                {table.started_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Since {formatTime(table.started_at)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Order Detail Panel */}
        {selectedTable && (
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">Table {selectedTable.number}</h2>
              <button
                onClick={() => { setSelectedTable(null); setOrders([]); }}
                className="text-gray-400 text-xl"
              >✕</button>
            </div>

            {orders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-400">{formatTime(order.created_at)}</span>
                      <div className="flex gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                        {order.payment_method && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {order.payment_method}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 mb-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.quantity}× {item.name}</span>
                          <span className="text-gray-500">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between font-semibold text-sm border-t pt-2">
                      <span>Total</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>

                    {order.payment_status !== 'paid' && (
                      <button
                        onClick={() => handleAction('mark_paid', order.id)}
                        disabled={actionLoading}
                        className="w-full mt-2 bg-green-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedTable.status !== 'free' && (
              <button
                onClick={() => handleAction('close_table')}
                disabled={actionLoading}
                className="w-full mt-4 bg-gray-800 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Close Table
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
