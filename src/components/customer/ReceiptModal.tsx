'use client';

import { useRef } from 'react';

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

interface Receipt {
  receipt_number: string;
  restaurant_name: string;
  table_number: number;
  seat_code?: string;
  payment_method: string;
  payment_mode: string;
  subtotal: string;
  vat_amount: string;
  tip_amount?: string;
  total: string;
  items: ReceiptItem[];
  issued_at: string;
}

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

interface Props {
  receipt: Receipt;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatPrice = (p: number | string) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const emoji = receipt.seat_code ? (seatEmoji[receipt.seat_code] || '🪑') : '';

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Receipt content */}
        <div ref={receiptRef} className="bg-white">

          {/* Header */}
          <div className="bg-gray-900 text-white text-center py-6 px-4">
            <p className="text-2xl font-black tracking-wide">🍽️</p>
            <h1 className="text-xl font-black mt-1 tracking-wide">
              {receipt.restaurant_name.toUpperCase()}
            </h1>
            <p className="text-xs text-gray-400 mt-1">Official Receipt</p>
          </div>

          <div className="px-5 py-4">

            {/* Receipt meta */}
            <div className="border border-dashed border-gray-200 rounded-xl p-3 mb-4 bg-gray-50">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Receipt No.</span>
                <span className="font-bold text-gray-800">{receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Table</span>
                <span className="font-medium text-gray-700">Table {receipt.table_number}</span>
              </div>
              {receipt.seat_code && (
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Seat</span>
                  <span className="font-medium text-gray-700">{emoji} {receipt.seat_code}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Date</span>
                <span className="font-medium text-gray-700">{formatDate(receipt.issued_at)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items</p>
              <div className="space-y-2">
                {receipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-800">{item.name}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-400">{item.quantity} × {formatPrice(item.price)}</p>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-gray-200 pt-3 mb-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>incl. VAT (19%)</span>
                <span>{formatPrice(receipt.vat_amount)}</span>
              </div>
              {receipt.tip_amount && Number(receipt.tip_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Tip</span>
                  <span>+{formatPrice(receipt.tip_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg text-gray-900 pt-1 border-t border-gray-200">
                <span>TOTAL</span>
                <span className="text-orange-600">{formatPrice(receipt.total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
              <p className="text-sm font-semibold text-green-700">
                {receipt.payment_method === 'card' ? '💳 Paid by Card' : '💵 Paid by Cash'}
                {' '}✅
              </p>
            </div>

            {/* Save hint */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-blue-600">
                📸 Take a screenshot to save your receipt
              </p>
            </div>

          </div>
        </div>

        {/* Close button — outside receipt area for clean screenshot */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
