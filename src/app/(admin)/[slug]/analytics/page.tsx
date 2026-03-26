'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface AnalyticsData {
  period: string;
  revenue: { total: number; tips: number; receipts: number };
  revenueByDay: { day: string; revenue: number; orders: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  paymentSplit: { method: string; count: number; revenue: number }[];
  busiestHours: { hour: number; orders: number }[];
  tablePerf: { table: number; label: string; sessions: number; revenue: number }[];
}

function formatEur(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

function Bar({ value, max, color = 'bg-orange-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?slug=${slug}&period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Analytics fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [slug, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxDayRevenue = Math.max(...(data?.revenueByDay.map(d => d.revenue) || [0]));
  const maxItemQty = Math.max(...(data?.topItems.map(i => i.qty) || [0]));
  const maxHourOrders = Math.max(...(data?.busiestHours.map(h => h.orders) || [0]));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">📊 Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Restaurant performance overview</p>
          </div>
          <div className="flex gap-2">
            {['1d', '7d', '30d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  period === p ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-400'
                }`}
              >
                {p === '1d' ? 'Today' : p === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-lg">Loading analytics...</p>
          </div>
        ) : !data ? (
          <p className="text-red-500">Failed to load data.</p>
        ) : (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                <p className="text-3xl font-black text-gray-900">{formatEur(data.revenue.total)}</p>
                <p className="text-xs text-green-600 mt-1">incl. {formatEur(data.revenue.tips)} tips</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Receipts Issued</p>
                <p className="text-3xl font-black text-gray-900">{data.revenue.receipts}</p>
                <p className="text-xs text-gray-400 mt-1">completed payments</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Avg per Receipt</p>
                <p className="text-3xl font-black text-gray-900">
                  {data.revenue.receipts > 0 ? formatEur(data.revenue.total / data.revenue.receipts) : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">average spend</p>
              </div>
            </div>

            {/* Revenue by Day */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-4">Revenue by Day</h2>
              {data.revenueByDay.length === 0 ? (
                <p className="text-gray-400 text-sm">No data for this period</p>
              ) : (
                <div className="space-y-3">
                  {data.revenueByDay.map(d => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">
                        {new Date(d.day).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex-1">
                        <Bar value={d.revenue} max={maxDayRevenue} />
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-20 text-right">{formatEur(d.revenue)}</span>
                      <span className="text-xs text-gray-400 w-16 text-right">{d.orders} orders</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">

              {/* Top Items */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-800 mb-4">🏆 Top Sellers</h2>
                {data.topItems.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.topItems.map((item, i) => (
                      <div key={item.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {item.name}
                          </span>
                          <span className="text-xs text-gray-500">{item.qty}× · {formatEur(item.revenue)}</span>
                        </div>
                        <Bar value={item.qty} max={maxItemQty} color="bg-orange-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Split */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-800 mb-4">💳 Payment Methods</h2>
                {data.paymentSplit.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-4">
                    {data.paymentSplit.map(p => (
                      <div key={p.method}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-700 capitalize">
                            {p.method === 'card' ? '💳 Card' : '💰 Cash'}
                          </span>
                          <span className="text-sm font-bold text-gray-800">{formatEur(p.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bar
                            value={p.revenue}
                            max={Math.max(...data.paymentSplit.map(x => x.revenue))}
                            color={p.method === 'card' ? 'bg-blue-400' : 'bg-green-400'}
                          />
                          <span className="text-xs text-gray-400 shrink-0">{p.count} orders</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">

              {/* Busiest Hours */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-800 mb-4">⏰ Busiest Hours</h2>
                {data.busiestHours.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.busiestHours.map(h => (
                      <div key={h.hour} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-14 shrink-0">
                          {String(h.hour).padStart(2, '0')}:00
                        </span>
                        <div className="flex-1">
                          <Bar value={h.orders} max={maxHourOrders} color="bg-purple-400" />
                        </div>
                        <span className="text-xs text-gray-500 w-16 text-right">{h.orders} orders</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Table Performance */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-800 mb-4">🪑 Table Performance</h2>
                {data.tablePerf.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.tablePerf.slice(0, 6).map(t => (
                      <div key={t.table} className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Table {t.table}</span>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{t.sessions} sessions</span>
                          <span className="font-bold text-gray-800">{formatEur(t.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
