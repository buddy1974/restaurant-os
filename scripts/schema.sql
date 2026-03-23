-- RESTAURANTS
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#000000',
  currency      TEXT DEFAULT 'EUR',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- PAYMENT METHODS PER RESTAURANT
CREATE TABLE IF NOT EXISTS restaurant_payment_methods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  method        TEXT NOT NULL,
  enabled       BOOLEAN DEFAULT true
);

-- TABLES
CREATE TABLE IF NOT EXISTS tables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  number        INTEGER NOT NULL,
  label         TEXT,
  status        TEXT DEFAULT 'free',
  qr_code_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, number)
);

-- MENU CATEGORIES
CREATE TABLE IF NOT EXISTS menu_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  active        BOOLEAN DEFAULT true
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES menu_categories(id),
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  image_url     TEXT,
  is_drink      BOOLEAN DEFAULT false,
  is_addon      BOOLEAN DEFAULT false,
  is_popular    BOOLEAN DEFAULT false,
  available     BOOLEAN DEFAULT true,
  upsell_group  TEXT,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- TABLE SESSIONS
CREATE TABLE IF NOT EXISTS table_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  table_id      UUID REFERENCES tables(id),
  status        TEXT DEFAULT 'active',
  started_at    TIMESTAMPTZ DEFAULT now(),
  closed_at     TIMESTAMPTZ
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  restaurant_id  UUID REFERENCES restaurants(id),
  status         TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  total          NUMERIC(10,2) DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_id    UUID REFERENCES menu_items(id),
  name       TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  quantity   INTEGER DEFAULT 1,
  notes      TEXT
);
