import { useEffect, useState, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  sort_order: number;
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

interface UseMenuResult {
  categories: Category[];
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  refetchMenu: () => void;
}

export function useMenu(restaurantId: string | null, locale = 'en'): UseMenuResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/menu?restaurantId=${restaurantId}&locale=${locale}`);
      if (!res.ok) throw new Error('Failed to load menu');
      const data = await res.json();
      setCategories(data.categories);
      setItems(data.items);
    } catch {
      setError('Could not load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, locale]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { categories, items, loading, error, refetchMenu: fetchMenu };
}
