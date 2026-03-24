'use client';

import React, { useEffect, useState, useCallback } from 'react';

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
}

const emptyItem = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  is_popular: false,
  is_drink: false,
};

export default function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'tables'>('items');
  const [loading, setLoading] = useState(true);

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');

  // Tables
  interface TableRow {
    id: string;
    number: number;
    label: string;
    status: string;
    qr_code_url: string | null;
  }

  const [tables, setTables] = useState<TableRow[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
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
    if (!newTableNumber) return;
    setAddingTable(true);
    try {
      await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          number: parseInt(newTableNumber),
          label: newTableLabel || `Table ${newTableNumber}`,
        }),
      });
      setNewTableNumber('');
      setNewTableLabel('');
      fetchTables();
    } catch (err) {
      console.error('Failed to add table', err);
    } finally {
      setAddingTable(false);
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
    setShowItemForm(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id,
      is_popular: item.is_popular,
      is_drink: item.is_drink,
    });
    setShowItemForm(true);
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
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        <span className="text-sm text-gray-400 uppercase tracking-wide">{slug}</span>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 flex gap-4">
        {(['items', 'categories', 'tables'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">Menu Items ({items.length})</h2>
              <button
                onClick={openAddItem}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                + Add Item
              </button>
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
                                Popular
                              </span>
                            )}
                            {!item.available && (
                              <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
                                Unavailable
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
                            {item.available ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50"
                          >
                            Delete
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
              <h2 className="font-semibold text-gray-700">Tables ({tables.length})</h2>
            </div>

            {/* Add table form */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Add New Table</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Table #"
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={addTable}
                  disabled={addingTable || !newTableNumber}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </div>
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
                        Delete
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
              <h2 className="font-semibold text-gray-700">Categories ({categories.length})</h2>
              <button
                onClick={() => setShowCatForm(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                + Add Category
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
                    Delete
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>
              <button onClick={() => setShowItemForm(false)} className="text-gray-400 text-2xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">Name</label>
                <input
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="Item name"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 font-medium">Description</label>
                <input
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="Short description"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 font-medium">Price (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 font-medium">Category</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={itemForm.is_popular}
                    onChange={(e) => setItemForm({ ...itemForm, is_popular: e.target.checked })}
                  />
                  Popular
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={itemForm.is_drink}
                    onChange={(e) => setItemForm({ ...itemForm, is_drink: e.target.checked })}
                  />
                  Drink
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowItemForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl text-sm font-medium"
              >
                {editingItem ? 'Save Changes' : 'Add Item'}
              </button>
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
    </div>
  );
}
