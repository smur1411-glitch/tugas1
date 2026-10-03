-- Tabel user / auth lokal app toko
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'o',
  aktif BOOLEAN NOT NULL DEFAULT true,
  h TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE,
  barcode TEXT,
  nama TEXT NOT NULL,
  kat TEXT,
  sat TEXT,
  modal NUMERIC NOT NULL DEFAULT 0,
  jual NUMERIC NOT NULL DEFAULT 0,
  stok NUMERIC NOT NULL DEFAULT 0,
  min NUMERIC NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  exp DATE,
  foto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  inv TEXT UNIQUE,
  invoice TEXT,
  kasir TEXT,
  pembeli TEXT,
  sub NUMERIC NOT NULL DEFAULT 0,
  hpp NUMERIC NOT NULL DEFAULT 0,
  disc NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  bayar NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  kembali NUMERIC NOT NULL DEFAULT 0,
  change NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  metode TEXT,
  t BIGINT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  supplier TEXT,
  pid BIGINT,
  nama TEXT,
  item TEXT,
  qty NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  harga NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  u TEXT,
  t BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  cat TEXT,
  note TEXT,
  amt NUMERIC NOT NULL DEFAULT 0,
  metode TEXT,
  u TEXT,
  t BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  t BIGINT NOT NULL,
  u TEXT,
  a TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_aktif ON products(aktif);
CREATE INDEX IF NOT EXISTS idx_products_nama ON products(nama);
CREATE INDEX IF NOT EXISTS idx_sales_t ON sales(t);
CREATE INDEX IF NOT EXISTS idx_purchases_t ON purchases(t);
CREATE INDEX IF NOT EXISTS idx_expenses_t ON expenses(t);
CREATE INDEX IF NOT EXISTS idx_logs_t ON logs(t);

ALTER TABLE products ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS inv TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS kasir TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sub NUMERIC DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS hpp NUMERIC DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS disc NUMERIC DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change NUMERIC DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS pid BIGINT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS nama TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS u TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS metode TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS u TEXT;

-- Optional: table untuk stock movement report
CREATE TABLE IF NOT EXISTS moves (
  id BIGSERIAL PRIMARY KEY,
  pid BIGINT,
  nama TEXT,
  sebelum NUMERIC,
  delta NUMERIC,
  sesudah NUMERIC,
  alasan TEXT,
  ref TEXT,
  u TEXT,
  t BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read users" ON users;
DROP POLICY IF EXISTS "Allow anon write users" ON users;
DROP POLICY IF EXISTS "Allow anon update users" ON users;
DROP POLICY IF EXISTS "Allow anon delete users" ON users;
DROP POLICY IF EXISTS "Allow anon read products" ON products;
DROP POLICY IF EXISTS "Allow anon write products" ON products;
DROP POLICY IF EXISTS "Allow anon update products" ON products;
DROP POLICY IF EXISTS "Allow anon delete products" ON products;
DROP POLICY IF EXISTS "Allow anon read sales" ON sales;
DROP POLICY IF EXISTS "Allow anon write sales" ON sales;
DROP POLICY IF EXISTS "Allow anon update sales" ON sales;
DROP POLICY IF EXISTS "Allow anon delete sales" ON sales;
DROP POLICY IF EXISTS "Allow anon read purchases" ON purchases;
DROP POLICY IF EXISTS "Allow anon write purchases" ON purchases;
DROP POLICY IF EXISTS "Allow anon update purchases" ON purchases;
DROP POLICY IF EXISTS "Allow anon delete purchases" ON purchases;
DROP POLICY IF EXISTS "Allow anon read expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon write expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon update expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon delete expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon read settings" ON settings;
DROP POLICY IF EXISTS "Allow anon write settings" ON settings;
DROP POLICY IF EXISTS "Allow anon update settings" ON settings;
DROP POLICY IF EXISTS "Allow anon delete settings" ON settings;
DROP POLICY IF EXISTS "Allow anon read logs" ON logs;
DROP POLICY IF EXISTS "Allow anon write logs" ON logs;
DROP POLICY IF EXISTS "Allow anon update logs" ON logs;
DROP POLICY IF EXISTS "Allow anon delete logs" ON logs;
DROP POLICY IF EXISTS "Allow anon read moves" ON moves;
DROP POLICY IF EXISTS "Allow anon write moves" ON moves;
DROP POLICY IF EXISTS "Allow anon update moves" ON moves;
DROP POLICY IF EXISTS "Allow anon delete moves" ON moves;

CREATE POLICY "Allow anon read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anon write users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update users" ON users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete users" ON users FOR DELETE USING (true);

CREATE POLICY "Allow anon read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anon write products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete products" ON products FOR DELETE USING (true);

CREATE POLICY "Allow anon read sales" ON sales FOR SELECT USING (true);
CREATE POLICY "Allow anon write sales" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update sales" ON sales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete sales" ON sales FOR DELETE USING (true);

CREATE POLICY "Allow anon read purchases" ON purchases FOR SELECT USING (true);
CREATE POLICY "Allow anon write purchases" ON purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update purchases" ON purchases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete purchases" ON purchases FOR DELETE USING (true);

CREATE POLICY "Allow anon read expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow anon write expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update expenses" ON expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete expenses" ON expenses FOR DELETE USING (true);

CREATE POLICY "Allow anon read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow anon write settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update settings" ON settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete settings" ON settings FOR DELETE USING (true);

CREATE POLICY "Allow anon read logs" ON logs FOR SELECT USING (true);
CREATE POLICY "Allow anon write logs" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update logs" ON logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete logs" ON logs FOR DELETE USING (true);

CREATE POLICY "Allow anon read moves" ON moves FOR SELECT USING (true);
CREATE POLICY "Allow anon write moves" ON moves FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update moves" ON moves FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete moves" ON moves FOR DELETE USING (true);

-- CRUD helper queries
-- 1) Insert user
-- INSERT INTO users (username, nama, role, aktif, h)
-- VALUES ('admin', 'Admin Toko', 'o', true, 'hash_here');

-- 2) Get all products
-- SELECT * FROM products ORDER BY id;

-- 3) Insert product
-- INSERT INTO products (sku, barcode, nama, kat, sat, modal, jual, stok, min, aktif)
-- VALUES ('YG-001', '', 'Indomie Goreng', 'Mi Instan', 'bungkus', 0, 0, 0, 5, true);

-- 4) Update product stock
-- UPDATE products
-- SET stok = stok + 10
-- WHERE id = 1;

-- 5) Insert sales
-- INSERT INTO sales (invoice, total, bayar, kembali, status, pembeli, metode, t, items)
-- VALUES ('INV-001', 50000, 50000, 0, 'ok', 'Umum', 'Tunai', 1720000000, '[{"name":"Indomie Goreng","qty":2,"harga":25000}]'::jsonb);

-- 6) Delete row
-- DELETE FROM users WHERE username = 'admin';
