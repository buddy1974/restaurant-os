'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';

const BASE_URL = 'https://restaurant-os-one.vercel.app';

const TABLES = [
  { number: 1 },
  { number: 2 },
  { number: 3 },
  { number: 4 },
  { number: 5 },
  { number: 6 },
];

export default function DemoPage() {
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    TABLES.forEach(async (table) => {
      const url = `${BASE_URL}/demo/menu/${table.number}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#0D0D0D', light: '#FFFFFF' },
      });
      setQrCodes(prev => ({ ...prev, [table.number]: dataUrl }));
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1A1A1A', padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: '#F97316', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Live Demo</div>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Restaurant OS</div>
        <div style={{ fontSize: 14, color: '#888' }}>Tap any table to start ordering</div>
      </div>

      {/* Quick Links */}
      <div style={{ padding: '20px 16px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: '🍳 Kitchen', href: '/demo/kitchen' },
          { label: '⚙️ Admin', href: '/demo/admin' },
          { label: '📊 Staff', href: '/demo/staff' },
        ].map(link => (
          <Link key={link.href} href={link.href} style={{
            background: '#1A1A1A',
            border: '1px solid #F97316',
            color: '#F97316',
            padding: '12px 6px',
            borderRadius: 10,
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'block',
          }}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Table QR Codes */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>
          Customer Tables — Scan to Order
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {TABLES.map(table => (
            <Link
              key={table.number}
              href={`/demo/menu/${table.number}`}
              style={{
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: 14,
                padding: '20px 16px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div style={{ fontSize: 13, color: '#F97316', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>
                TABLE {table.number}
              </div>
              {qrCodes[table.number] ? (
                <img
                  src={qrCodes[table.number]}
                  alt={`Table ${table.number} QR`}
                  style={{ width: '100%', maxWidth: 160, borderRadius: 8, display: 'block', margin: '0 auto' }}
                />
              ) : (
                <div style={{ width: 120, height: 120, background: '#2A2A2A', borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 }}>
                  Loading...
                </div>
              )}
              <div style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
                Tap or scan to order
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Reset Section */}
      <div style={{ padding: '16px', marginTop: 8 }}>
        <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Demo Reset</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Clear all orders and sessions before a new demo presentation.</div>
          <ResetButton />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '24px 16px', textAlign: 'center', borderTop: '1px solid #1A1A1A', marginTop: 16 }}>
        <div style={{ fontSize: 11, color: '#444' }}>Stripe test: 4242 4242 4242 4242 · 12/34 · 123</div>
        <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>maxpromo.digital</div>
      </div>
    </div>
  );
}

function ResetButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleReset() {
    setState('loading');
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'demo-reset-2026' }),
      });
      const data = await res.json();
      if (data.ok) {
        setState('done');
        localStorage.clear();
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label = {
    idle: '🔄 Reset Demo',
    loading: 'Resetting...',
    done: '✅ Reset Complete — Ready for Demo',
    error: '❌ Reset Failed',
  }[state];

  const bg = {
    idle: '#F97316',
    loading: '#555',
    done: '#16A34A',
    error: '#DC2626',
  }[state];

  return (
    <button
      onClick={handleReset}
      disabled={state === 'loading'}
      style={{
        width: '100%',
        background: bg,
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        padding: '14px',
        fontSize: 15,
        fontWeight: 700,
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {label}
    </button>
  );
}
