'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';
import LanguagePicker from '@/components/customer/LanguagePicker';
import { t, Locale } from '@/lib/translations';

interface Category {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  is_drink: boolean;
  is_popular: boolean;
  available: boolean;
  upsell_group?: string;
  image_url?: string;
}

const emptyItem = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  is_popular: false,
  is_drink: false,
  image_url: '',
};

function AdminContent({ slug }: { slug: string }) {
  const { locale } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'tables'>('items');
  const [loading, setLoading] = useState(true);

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [itemStep, setItemStep] = useState(1);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ name: string; price: number; category_id: string; description: string; is_popular: boolean; is_drink: boolean }[] | null>(null);
  const [importError, setImportError] = useState('');

  // Tables
  interface TableRow {
    id: string;
    number: number;
    label: string;
    status: string;
    qr_code_url: string | null;
  }

  const [tables, setTables] = useState<TableRow[]>([]);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [addingTable, setAddingTable] = useState(false);
  const [qrLoading, setQrLoading] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/menu?slug=${slug}`);
      const data = await res.json();
      setCategories(data.categories || []);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch menu', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tables?slug=${slug}`);
      const data = await res.json();
      setTables(data.tables || []);
    } catch (err) {
      console.error('Failed to fetch tables', err);
    }
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'tables') fetchTables();
  }, [activeTab, fetchTables]);

  async function addTable() {
    if (!slug) return;
    const number = tables.length + 1;
    const label = newTableLabel.trim() || `Table ${number}`;
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, number, label }),
      });
      if (!res.ok) throw new Error('Failed');
      setNewTableLabel('');
      fetchTables();
    } catch (err) {
      console.error('addTable error:', err);
    }
  }

  async function deleteTable(id: string) {
    if (!confirm('Delete this table?')) return;
    await fetch(`/api/admin/tables?id=${id}`, { method: 'DELETE' });
    fetchTables();
  }

  async function downloadQR(tableNumber: number) {
    setQrLoading(String(tableNumber));
    try {
      const baseUrl = window.location.origin;
      const url = `/api/admin/qr?slug=${slug}&table=${tableNumber}&baseUrl=${encodeURIComponent(baseUrl)}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `table-${tableNumber}-qr.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to download QR', err);
    } finally {
      setQrLoading(null);
    }
  }

  function openAddItem() {
    setEditingItem(null);
    setItemForm(emptyItem);
    setItemStep(1);
    setShowItemForm(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemStep(1);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id,
      is_popular: item.is_popular,
      is_drink: item.is_drink,
      image_url: item.image_url || '',
    });
    setShowItemForm(true);
  }

  async function fetchItemImage(itemName: string) {
    if (!itemName.trim()) return;
    setFetchingImage(true);
    try {
      const res = await fetch(`/api/admin/image-search?query=${encodeURIComponent(itemName)}`);
      const data = await res.json();
      if (data.url) {
        setItemForm((prev) => ({ ...prev, image_url: data.url }));
      }
    } catch (err) {
      console.error('Failed to fetch image', err);
    } finally {
      setFetchingImage(false);
    }
  }

  async function saveItem() {
    if (!itemForm.name || !itemForm.price || !itemForm.category_id) return;

    if (editingItem) {
      await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          id: editingItem.id,
          data: { ...itemForm, price: parseFloat(itemForm.price) },
        }),
      });
    } else {
      await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          type: 'item',
          data: { ...itemForm, price: parseFloat(itemForm.price) },
        }),
      });
    }

    setShowItemForm(false);
    fetchMenu();
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch('/api/admin/menu', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'toggle',
        id: item.id,
        data: { available: !item.available },
      }),
    });
    fetchMenu();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/admin/menu?id=${id}&type=item`, { method: 'DELETE' });
    fetchMenu();
  }

  async function saveCategory() {
    if (!catName) return;
    await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        type: 'category',
        data: { name: catName },
      }),
    });
    setCatName('');
    setShowCatForm(false);
    fetchMenu();
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category? Items inside will also be deleted.')) return;
    await fetch(`/api/admin/menu?id=${id}&type=category`, { method: 'DELETE' });
    fetchMenu();
  }

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">{t(locale as Locale, 'loading')}</p>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">{t(locale as Locale, 'adminPanel')}</h1>
        <div className="flex items-center gap-4">
          <LanguagePicker />
          <Link
            href={`/${slug}/analytics`}
            className="text-sm text-orange-500 font-semibold hover:underline"
          >
            📊 View Analytics
          </Link>
          <span className="text-sm text-gray-400 uppercase tracking-wide">{slug}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 flex gap-4">
        {(['items', 'categories', 'tables'] as const).map((tab) => {
          const tabLabel: Record<string, string> = {
            items: t(locale as Locale, 'tabItems'),
            categories: t(locale as Locale, 'tabCategories'),
            tables: t(locale as Locale, 'tabTables'),
          };
          return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            {tabLabel[tab]}
          </button>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">{t(locale as Locale, 'tabItems')} ({items.length})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  🤖 {t(locale as Locale, 'importMenu')}
                </button>
                <button
                  onClick={openAddItem}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {t(locale as Locale, 'addItem')}
                </button>
              </div>
            </div>

            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category_id === cat.id);
              return (
                <div key={cat.id} className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {cat.name}
                  </h3>
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border p-4 flex justify-between items-center ${
                          !item.available ? 'opacity-50' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.is_popular && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                {t(locale as Locale, 'popular')}
                              </span>
                            )}
                            {!item.available && (
                              <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
                                {t(locale as Locale, 'unavailable')}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
                          )}
                          <p className="text-orange-500 font-semibold mt-1">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                              item.available
                                ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {item.available ? t(locale as Locale, 'disable') : t(locale as Locale, 'enable')}
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            {t(locale as Locale, 'edit')}
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50"
                          >
                            {t(locale as Locale, 'delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                    {catItems.length === 0 && (
                      <p className="text-sm text-gray-300 pl-2">No items in this category.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* TABLES TAB */}
        {activeTab === 'tables' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">{t(locale as Locale, 'tabTables')} ({tables.length})</h2>
            </div>

            {/* Add table form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
              <p className="font-bold text-gray-800 mb-3">{t(locale as Locale, 'addNewTable')}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTable()}
                  placeholder={`e.g. Window Table, Bar 1, Terrace... (will be Table ${tables.length + 1})`}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={addTable}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Table number assigned automatically · Press Enter to add</p>
            </div>

            {/* Tables list */}
            <div className="space-y-2">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">Table {table.number}</p>
                      <p className="text-xs text-gray-400">{table.label}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                        table.status === 'free'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {table.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* QR Preview */}
                      <img
                        src={`/api/admin/qr?slug=${slug}&table=${table.number}&baseUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                        alt={`QR Table ${table.number}`}
                        className="w-16 h-16 rounded-lg border border-gray-100"
                      />

                      {/* Download button */}
                      <button
                        onClick={() => downloadQR(table.number)}
                        disabled={qrLoading === String(table.number)}
                        className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 flex flex-col items-center gap-0.5"
                      >
                        {qrLoading === String(table.number) ? (
                          <span>...</span>
                        ) : (
                          <>
                            <span>⬇</span>
                            <span>QR</span>
                          </>
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => deleteTable(table.id)}
                        className="border border-red-100 text-red-400 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-50"
                      >
                        {t(locale as Locale, 'delete')}
                      </button>
                    </div>
                  </div>

                  {/* QR URL */}
                  <p className="text-xs font-mono text-gray-300 mt-2 truncate">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/{slug}/menu/{table.number}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">{t(locale as Locale, 'tabCategories')} ({categories.length})</h2>
              <button
                onClick={() => setShowCatForm(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {t(locale as Locale, 'addCategory')}
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {items.filter((i) => i.category_id === cat.id).length} items
                    </p>
                  </div>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50"
                  >
                    {t(locale as Locale, 'delete')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-lg">{editingItem ? t(locale as Locale, 'editItem') : t(locale as Locale, 'addMenuItem')}</h2>
                <div className="flex gap-1 mt-2">
                  {[1,2,3].map(s => (
                    <div key={s} className={`h-1 w-8 rounded-full transition-all ${itemStep >= s ? 'bg-orange-500' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              <button onClick={() => { setShowItemForm(false); setItemStep(1); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5">

              {/* STEP 1 — Name & Price */}
              {itemStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">What is this dish called?</label>
                    <input
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      placeholder="e.g. Jollof Rice, Grilled Chicken..."
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-base focus:outline-none focus:border-orange-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Price (€)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Short description (optional)</label>
                    <input
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      placeholder="e.g. Served with rice and salad"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    onClick={() => setItemStep(2)}
                    disabled={!itemForm.name || !itemForm.price}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base transition-colors"
                  >
                    Next: Add Photo →
                  </button>
                </div>
              )}

              {/* STEP 2 — Photo */}
              {itemStep === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">Photo for {itemForm.name}</label>

                  {/* Upload from device */}
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${itemForm.image_url ? 'border-orange-300 bg-orange-50' : 'border-gray-300 hover:border-orange-400 bg-gray-50'}`}>
                      {itemForm.image_url ? (
                        <div className="relative">
                          <img src={itemForm.image_url} className="w-full h-40 object-cover rounded-xl" alt="preview" />
                          <p className="text-xs text-orange-600 mt-2 font-semibold">✓ Photo added — tap to change</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-5xl mb-3">📷</p>
                          <p className="font-bold text-gray-700">Tap to upload photo</p>
                          <p className="text-sm text-gray-400 mt-1">From your phone camera or PC</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setFetchingImage(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          const data = await res.json();
                          if (data.url) {
                            setItemForm(prev => ({ ...prev, image_url: data.url }));
                          } else {
                            console.error('Upload error:', data.error);
                          }
                        } catch (err) {
                          console.error('Upload failed:', err);
                        } finally {
                          setFetchingImage(false);
                        }
                      }}
                    />
                  </label>

                  {/* Auto-find from internet */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fetchItemImage(itemForm.name)}
                      disabled={fetchingImage}
                      className="flex-1 border-2 border-gray-200 hover:border-orange-400 text-gray-600 font-semibold py-3 rounded-xl text-sm transition-all"
                    >
                      {fetchingImage ? '⏳ Searching...' : '🔍 Auto-find from internet'}
                    </button>
                    {itemForm.image_url && (
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, image_url: '' })}
                        className="border-2 border-red-200 text-red-400 hover:bg-red-50 px-4 rounded-xl text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setItemStep(1)}
                      className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setItemStep(3)}
                      className="flex-2 flex-grow bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      Next: Category →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Category & flags */}
              {itemStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Which category?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setItemForm({ ...itemForm, category_id: cat.id })}
                          className={`py-4 px-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                            itemForm.category_id === cat.id
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setItemForm({ ...itemForm, is_popular: !itemForm.is_popular })}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                        itemForm.is_popular ? 'bg-yellow-400 text-white border-yellow-400' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      ⭐ Popular dish
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemForm({ ...itemForm, is_drink: !itemForm.is_drink })}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                        itemForm.is_drink ? 'bg-blue-400 text-white border-blue-400' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      🥤 It&apos;s a drink
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setItemStep(2)}
                      className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={async () => { await saveItem(); setItemStep(1); }}
                      disabled={!itemForm.category_id}
                      className="flex-2 flex-grow bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base transition-colors"
                    >
                      {editingItem ? t(locale as Locale, 'saveChanges') : t(locale as Locale, 'addToMenu')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Add Category</h2>
              <button onClick={() => setShowCatForm(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Category name"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCatForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center py-6">
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

    {/* AI Import Modal */}
    {showImportModal && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">🤖 AI Menu Import</h2>
            <button
              onClick={() => { setShowImportModal(false); setImportResult(null); setImportError(''); }}
              className="text-gray-400 text-2xl"
            >✕</button>
          </div>

          {!importResult ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Upload a photo of your printed menu, or paste an image URL. Claude AI will extract all items automatically.</p>

              {/* Photo upload */}
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-8 text-center transition-all">
                  <p className="text-4xl mb-2">📷</p>
                  <p className="font-semibold text-gray-700">Upload menu photo</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG — photo of printed menu or screenshot</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImporting(true);
                    setImportError('');
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      try {
                        const base64 = (reader.result as string).split(',')[1];
                        const res = await fetch('/api/menu-import', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ slug, imageBase64: base64, mediaType: file.type }),
                        });
                        const data = await res.json();
                        if (data.items && data.items.length > 0) {
                          setImportResult(data.items);
                        } else {
                          setImportError('No menu items found. Try a clearer photo.');
                        }
                      } catch {
                        setImportError('Import failed. Please try again.');
                      } finally {
                        setImporting(false);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              {/* URL input */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Or paste image URL</p>
                <div className="flex gap-2">
                  <input
                    id="import-url-input"
                    type="url"
                    placeholder="https://example.com/menu.jpg"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById('import-url-input') as HTMLInputElement;
                      const url = input?.value.trim();
                      if (!url) return;
                      setImporting(true);
                      setImportError('');
                      try {
                        const res = await fetch('/api/menu-import', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ slug, imageUrl: url }),
                        });
                        const data = await res.json();
                        if (data.items && data.items.length > 0) {
                          setImportResult(data.items);
                        } else {
                          setImportError('No items found at that URL.');
                        }
                      } catch {
                        setImportError('Import failed.');
                      }
                      setImporting(false);
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                  >Go</button>
                </div>
              </div>

              {importing && (
                <div className="text-center py-6">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
                  <p className="text-sm text-gray-600">Claude is reading your menu...</p>
                </div>
              )}

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">{importError}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-green-700 font-semibold">✅ Found {importResult.length} menu items</p>
                <p className="text-xs text-green-600 mt-1">Review and click &quot;Add All to Menu&quot; to import</p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {importResult.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      <p className="text-xs text-gray-400">{categories.find(c => c.id === item.category_id)?.name || 'Unknown category'}</p>
                    </div>
                    <p className="text-sm font-bold text-orange-600 ml-3 shrink-0">€{Number(item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setImportResult(null); setImportError(''); }}
                  className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl"
                >
                  ← Try again
                </button>
                <button
                  onClick={async () => {
                    setImporting(true);
                    let added = 0;
                    for (const item of importResult) {
                      try {
                        await fetch('/api/admin/menu', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            slug,
                            type: 'item',
                            data: {
                              name: item.name,
                              description: item.description,
                              price: item.price,
                              category_id: item.category_id,
                              is_popular: item.is_popular,
                              is_drink: item.is_drink,
                              available: true,
                              image_url: null,
                            },
                          }),
                        });
                        added++;
                      } catch { /* skip failed items */ }
                    }
                    setImporting(false);
                    setShowImportModal(false);
                    setImportResult(null);
                    fetchMenu();
                    alert(`✅ ${added} items imported successfully!`);
                  }}
                  disabled={importing}
                  className="flex-2 flex-grow bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {importing ? 'Importing...' : `✅ Add All ${importResult.length} Items`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

export default function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);
  return (
    <LanguageProvider>
      <AdminContent slug={slug} />
    </LanguageProvider>
  );
}
