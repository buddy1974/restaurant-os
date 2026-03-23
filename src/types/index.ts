export type TableStatus = 'free' | 'occupied' | 'waiting_payment' | 'closed';
export type SessionStatus = 'active' | 'waiting_payment' | 'paid' | 'closed';
export type OrderStatus = 'pending' | 'confirmed' | 'served' | 'cancelled';
export type PaymentMethod = 'cash' | 'card';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  currency: string;
  active: boolean;
}

export interface Table {
  id: string;
  restaurant_id: string;
  number: number;
  label?: string;
  status: TableStatus;
  qr_code_url?: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_drink: boolean;
  is_popular: boolean;
  available: boolean;
  upsell_group?: string;
}

export interface TableSession {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: SessionStatus;
  started_at: string;
  closed_at?: string;
}

export interface Order {
  id: string;
  session_id: string;
  restaurant_id: string;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  total: number;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}
