-- ═══════════════════════════════════════════════════════════════
-- ServingSync POS — Supabase SQL Migration
-- ═══════════════════════════════════════════════════════════════
-- HOW TO USE:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project (bepwybrooyosdlkajrro)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Paste this ENTIRE file
-- 6. Click "Run"
-- 7. Wait for it to complete — all tables will be created
-- ═══════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Drop existing tables (clean slate) ───
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "LicenseActivation" CASCADE;
DROP TABLE IF EXISTS "LicenseKey" CASCADE;
DROP TABLE IF EXISTS "ZomatoOrder" CASCADE;
DROP TABLE IF EXISTS "ShopSetting" CASCADE;
DROP TABLE IF EXISTS "AppUser" CASCADE;
DROP TABLE IF EXISTS "MoneyOut" CASCADE;
DROP TABLE IF EXISTS "MoneyIn" CASCADE;
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "Purchase" CASCADE;
DROP TABLE IF EXISTS "Supplier" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "Bill" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "RestaurantTable" CASCADE;
DROP TABLE IF EXISTS "MenuItem" CASCADE;
DROP TABLE IF EXISTS "Shop" CASCADE;

-- ─── Shop ───
CREATE TABLE "Shop" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "address" TEXT,
    "phone" TEXT,
    "gstin" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "serviceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'Rs.',
    "color" TEXT NOT NULL DEFAULT 'orange',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- ─── MenuItem ───
CREATE TABLE "MenuItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Pcs',
    "image" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX "MenuItem_shopId_category_idx" ON "MenuItem"("shopId", "category");

-- ─── RestaurantTable ───
CREATE TABLE "RestaurantTable" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Table',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentOrderId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "RestaurantTable_shopId_number_key" ON "RestaurantTable"("shopId", "number");
CREATE INDEX "RestaurantTable_shopId_idx" ON "RestaurantTable"("shopId");

-- ─── Order ───
CREATE TABLE "Order" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "type" TEXT NOT NULL DEFAULT 'dine_in',
    "guests" INTEGER NOT NULL DEFAULT 1,
    "waiterName" TEXT,
    "customerName" TEXT,
    "notes" TEXT,
    "kotPrinted" BOOLEAN NOT NULL DEFAULT false,
    "billPrinted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
    FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id")
);
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- ─── OrderItem ───
CREATE TABLE "OrderItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- ─── Bill ───
CREATE TABLE "Bill" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "billNo" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL UNIQUE,
    "tableNumber" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "paymentStatus" TEXT NOT NULL DEFAULT 'paid',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
);
CREATE UNIQUE INDEX "Bill_shopId_billNo_key" ON "Bill"("shopId", "billNo");
CREATE INDEX "Bill_shopId_paidAt_idx" ON "Bill"("shopId", "paidAt");
CREATE INDEX "Bill_tableNumber_idx" ON "Bill"("tableNumber");

-- ─── Customer ───
CREATE TABLE "Customer" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX "Customer_shopId_name_idx" ON "Customer"("shopId", "name");

-- ─── Supplier ───
CREATE TABLE "Supplier" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "Supplier_shopId_name_idx" ON "Supplier"("shopId", "name");

-- ─── Purchase ───
CREATE TABLE "Purchase" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "notes" TEXT,
    "items" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "Purchase_shopId_createdAt_idx" ON "Purchase"("shopId", "createdAt");

-- ─── Expense ───
CREATE TABLE "Expense" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "date" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "Expense_shopId_date_idx" ON "Expense"("shopId", "date");
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- ─── MoneyIn ───
CREATE TABLE "MoneyIn" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "partyName" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "date" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "MoneyIn_shopId_date_idx" ON "MoneyIn"("shopId", "date");

-- ─── MoneyOut ───
CREATE TABLE "MoneyOut" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "partyName" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "date" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "MoneyOut_shopId_date_idx" ON "MoneyOut"("shopId", "date");

-- ─── AppUser ───
CREATE TABLE "AppUser" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "shopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL
);
CREATE INDEX "AppUser_shopId_idx" ON "AppUser"("shopId");

-- ─── ShopSetting ───
CREATE TABLE "ShopSetting" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL UNIQUE,
    "shopName" TEXT NOT NULL DEFAULT 'ServingSync Restaurant',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "serviceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'Rs.',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "kotPrefix" TEXT NOT NULL DEFAULT 'KOT',
    "footerNote" TEXT NOT NULL DEFAULT 'Thank you for dining with us!',
    "billShowLogo" BOOLEAN NOT NULL DEFAULT true,
    "billShowGstin" BOOLEAN NOT NULL DEFAULT true,
    "billShowPhone" BOOLEAN NOT NULL DEFAULT true,
    "billShowAddress" BOOLEAN NOT NULL DEFAULT true,
    "billShowEmail" BOOLEAN NOT NULL DEFAULT false,
    "billShowDateTime" BOOLEAN NOT NULL DEFAULT true,
    "billShowWaiter" BOOLEAN NOT NULL DEFAULT true,
    "billShowCustomer" BOOLEAN NOT NULL DEFAULT true,
    "billShowKotNo" BOOLEAN NOT NULL DEFAULT true,
    "billFontSize" INTEGER NOT NULL DEFAULT 11,
    "billHeaderAlign" TEXT NOT NULL DEFAULT 'center',
    "billExtraNote" TEXT,
    "billAccentColor" TEXT NOT NULL DEFAULT '#f97316',
    "kotShowLogo" BOOLEAN NOT NULL DEFAULT true,
    "kotShowWaiter" BOOLEAN NOT NULL DEFAULT true,
    "kotShowDateTime" BOOLEAN NOT NULL DEFAULT true,
    "kotShowTable" BOOLEAN NOT NULL DEFAULT true,
    "kotShowGuests" BOOLEAN NOT NULL DEFAULT true,
    "kotFontSize" INTEGER NOT NULL DEFAULT 12,
    "kotHeaderAlign" TEXT NOT NULL DEFAULT 'center',
    "kotAccentColor" TEXT NOT NULL DEFAULT '#f97316',
    "kotExtraNote" TEXT,
    "zomatoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "zomatoApiKey" TEXT,
    "zomatoRestaurantId" TEXT,
    "zomatoApiBaseUrl" TEXT,
    "zomatoWebhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);

-- ─── ZomatoOrder ───
CREATE TABLE "ZomatoOrder" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL,
    "zomatoOrderId" TEXT NOT NULL UNIQUE,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "deliveryType" TEXT NOT NULL DEFAULT 'delivery',
    "address" TEXT,
    "items" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'prepaid',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "internalOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX "ZomatoOrder_shopId_status_idx" ON "ZomatoOrder"("shopId", "status");
CREATE INDEX "ZomatoOrder_createdAt_idx" ON "ZomatoOrder"("createdAt");

-- ─── LicenseKey ───
CREATE TABLE "LicenseKey" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "key" TEXT NOT NULL UNIQUE,
    "duration" INTEGER NOT NULL DEFAULT 365,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- ─── LicenseActivation ───
CREATE TABLE "LicenseActivation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "key" TEXT NOT NULL UNIQUE,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "machineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- ─── AuditLog ───
CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- Insert Shop 1: Spice Garden
INSERT INTO "Shop" ("id", "name", "code", "color", "address", "phone", "gstin", "taxRate", "currency")
VALUES ('shop_spice_001', 'Spice Garden', 'SPICE', 'orange', '12 Marine Drive, Mumbai', '+91 98200 11223', '27SPICE2024G1Z9', 5, 'Rs.');

INSERT INTO "ShopSetting" ("id", "shopId", "shopName", "address", "phone", "gstin", "taxRate", "currency", "billAccentColor", "kotAccentColor")
VALUES ('set_spice_001', 'shop_spice_001', 'Spice Garden', '12 Marine Drive, Mumbai', '+91 98200 11223', '27SPICE2024G1Z9', 5, 'Rs.', '#f97316', '#f97316');

-- Insert tables for Spice Garden (0=Direct Counter, 1-10)
INSERT INTO "RestaurantTable" ("id", "shopId", "number", "name", "capacity", "status")
VALUES ('tbl_spice_0', 'shop_spice_001', 0, 'Direct Counter', 0, 'available');
INSERT INTO "RestaurantTable" ("shopId", "number", "name", "capacity", "status")
SELECT 'shop_spice_001', g.n, 'Table ' || g.n, 4, 'available' FROM generate_series(1,10) AS g(n);

-- Insert Shop 2: Belly Bytes
INSERT INTO "Shop" ("id", "name", "code", "color", "address", "phone", "gstin", "taxRate", "currency")
VALUES ('shop_belly_001', 'Belly Bytes', 'BELLY', 'emerald', '45 Brigade Road, Bengaluru', '+91 80400 55667', '29BELLY2024G1Z2', 5, 'Rs.');

INSERT INTO "ShopSetting" ("id", "shopId", "shopName", "address", "phone", "gstin", "taxRate", "currency", "billAccentColor", "kotAccentColor")
VALUES ('set_belly_001', 'shop_belly_001', 'Belly Bytes', '45 Brigade Road, Bengaluru', '+91 80400 55667', '29BELLY2024G1Z2', 5, 'Rs.', '#10b981', '#10b981');

INSERT INTO "RestaurantTable" ("id", "shopId", "number", "name", "capacity", "status")
VALUES ('tbl_belly_0', 'shop_belly_001', 0, 'Direct Counter', 0, 'available');
INSERT INTO "RestaurantTable" ("shopId", "number", "name", "capacity", "status")
SELECT 'shop_belly_001', g.n, 'Table ' || g.n, 4, 'available' FROM generate_series(1,10) AS g(n);

-- Insert menu items for both shops
INSERT INTO "MenuItem" ("shopId", "name", "category", "price", "cost", "stock", "unit", "available")
SELECT s.id, m.name, m.category, m.price, m.cost, 100, 'Pcs', true
FROM (
    VALUES
        ('Maha Jumbo Sandwich', 'Sandwich', 150, 60),
        ('Cheese Chutney Sandwich', 'Sandwich', 90, 36),
        ('Ultimate Cheese Burst Pizza', 'Pizza', 250, 100),
        ('Royal Paneer Tandoori Pizza', 'Pizza', 200, 80),
        ('Classic Veg Delight Pizza', 'Pizza', 180, 72),
        ('Cheesy Corn Burst Pizza', 'Pizza', 180, 72),
        ('Thuso Special Loaded Maggie', 'Maggie', 180, 72),
        ('Tandoori Paneer Maggie', 'Maggie', 150, 60),
        ('Double Masala Cheese Maggie', 'Maggie', 100, 40),
        ('Cheese Corn Momos', 'Momos', 90, 36),
        ('Paneer Momos', 'Momos', 80, 32),
        ('Veg Momos', 'Momos', 70, 28),
        ('Double Tikki Cheese Royale Burger', 'Burgers', 130, 52),
        ('Classic Veg Cheese Burger', 'Burgers', 90, 36),
        ('Cheese Ling Chips', 'Chips & Fries', 100, 40),
        ('Peri Peri Fries', 'Chips & Fries', 90, 36),
        ('Salted Fries', 'Chips & Fries', 90, 36),
        ('Cold Coffee', 'Drinks', 80, 32),
        ('Classic Mojito', 'Drinks', 80, 32),
        ('Watermelon Juice', 'Juices', 70, 28),
        ('Papaya Juice', 'Juices', 70, 28),
        ('Muskmelon Juice', 'Juices', 80, 32),
        ('Pink Guava Juice', 'Juices', 80, 32),
        ('Chikoo Juice', 'Juices', 80, 32),
        ('Pineapple Juice', 'Juices', 90, 36),
        ('Alphonso Mango Juice', 'Juices', 90, 36),
        ('Custard Apple Juice', 'Juices', 90, 36),
        ('Oreo Shake', 'Shakes', 100, 40),
        ('KitKat Shake', 'Shakes', 100, 40),
        ('Watermelon Shake', 'Shakes', 100, 40),
        ('Papaya Shake', 'Shakes', 100, 40),
        ('Muskmelon Shake', 'Shakes', 110, 44),
        ('Pink Guava Shake', 'Shakes', 110, 44),
        ('Chikoo Shake', 'Shakes', 110, 44),
        ('Pineapple Shake', 'Shakes', 120, 48),
        ('Alphonso Mango Shake', 'Shakes', 120, 48),
        ('Custard Apple Shake', 'Shakes', 120, 48)
) AS m(name, category, price, cost)
CROSS JOIN "Shop" s;

-- Insert Super Admin user
INSERT INTO "AppUser" ("id", "name", "email", "password", "role", "active", "shopId")
VALUES ('user_super_001', 'Super Admin', 'super@servingsync.com', 'admin123', 'admin', true, NULL);

-- Insert license keys
INSERT INTO "LicenseKey" ("key", "duration", "used")
VALUES
    ('SSYNC-PVKN-9U9R-HDCR', 365, false),
    ('SSYNC-L2U4-6QND-DZ2D', 365, false),
    ('SSYNC-QNQG-25HG-LMXK', 365, false),
    ('SSYNC-4GTM-DJ4T-TQ5H', 365, false),
    ('SSYNC-VZ4Y-7XAD-6JJF', 365, false),
    ('SSYNC-3H2E-RUFH-5YEE', 365, false),
    ('SSYNC-EPNX-49ZJ-ZUNP', 365, false),
    ('SSYNC-CQ26-NQ4P-EXHG', 365, false),
    ('SSYNC-NYM5-UHGD-257M', 365, false),
    ('SSYNC-8E6P-CPJ8-SH6Q', 365, false),
    ('SSYNC-CW5J-CJY2-4N35', 365, false),
    ('SSYNC-DV2E-YNQB-UESS', 365, false),
    ('SSYNC-RW8Y-2X3R-QAK5', 365, false),
    ('SSYNC-YX9E-VAFG-A438', 365, false),
    ('SSYNC-YBBG-AWF4-8SJB', 365, false),
    ('SSYNC-JLFC-KR6V-7HE3', 365, false),
    ('SSYNC-L2XC-NJMB-U7EG', 365, false),
    ('SSYNC-H36K-RD2Y-5XGW', 365, false),
    ('SSYNC-JFF9-N789-YGJ2', 365, false),
    ('SSYNC-3PAZ-HBEE-WAYR', 365, false);

-- ═══════════════════════════════════════════════════════════════
-- DONE! All tables created and seeded.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- KOT EVENTS TABLE (for cross-device sync via Supabase Realtime)
-- ═══════════════════════════════════════════════════════════════
-- This is the ONLY table that stores data in Supabase.
-- All other data stays in local SQLite on each device.
-- Kitchen devices subscribe to this table via Realtime.

CREATE TABLE IF NOT EXISTS kot_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (allow public read/insert for now)
ALTER TABLE kot_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON kot_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON kot_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON kot_events FOR UPDATE USING (true);

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE kot_events;
