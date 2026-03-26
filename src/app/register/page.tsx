'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      router.push(`/${data.slug}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const slug = form.name
    ? form.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50)
    : '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="text-3xl font-black text-gray-900">Restaurant OS</h1>
          <p className="text-gray-500 mt-2">Set up your restaurant in 60 seconds</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Restaurant name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Pizza Roma"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {slug && (
                <p className="text-xs text-gray-400 mt-1">
                  Your URL: <span className="font-mono text-orange-500">restaurant-os.com/{slug}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Owner email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@yourrestaurant.com"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+49 211 000000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Königsallee 1, 40212 Düsseldorf"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-base"
            >
              {loading ? 'Setting up your restaurant...' : '🚀 Get started — it\'s free'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            No credit card required · Setup takes 60 seconds
          </p>
        </div>

        {/* What you get */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-bold text-gray-700 mb-3">What you get instantly:</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span> QR code ordering for your tables</div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Card & cash payments</div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Kitchen display system</div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Telegram staff notifications</div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span> AI-powered upsell suggestions</div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Receipts with VAT</div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/" className="text-orange-500 font-semibold hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
