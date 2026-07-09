# ServingSync POS — Architecture

## OFFLINE-FIRST (Priority #1)

### How It Works
ALL data is stored in **SQLite on the device**. No internet needed for anything.

```
┌─────────────────────────────────┐
│         DEVICE (Phone/PC)        │
│                                  │
│  ┌───────────┐  ┌─────────────┐ │
│  │ Next.js    │  │ SQLite DB   │ │
│  │ Frontend   │←→│ (file on    │ │
│  │ + API      │  │  device)    │ │
│  │ Routes     │  │             │ │
│  └───────────┘  └─────────────┘ │
│                                  │
│  Everything works OFFLINE:       │
│  ✅ Login                        │
│  ✅ Orders / KOT / Bills         │
│  ✅ Menu / Tables / Reports      │
│  ✅ License activation           │
│  ✅ All data stored locally      │
└─────────────────────────────────┘
```

### Platforms

| Platform | How It Works | Offline? |
|----------|-------------|----------|
| **Desktop (.exe)** | Electron runs Next.js server + SQLite on the PC | ✅ 100% offline |
| **Local browser** | `bun run dev` runs server + SQLite locally | ✅ 100% offline |
| **APK (Capacitor)** | Phone calls hosted server for API. SQLite on server. | ⚠️ Needs internet for API |
| **Vercel hosted** | Server on Vercel, SQLite doesn't work (no filesystem) | ❌ Use Supabase PostgreSQL |

---

## ONLINE MODE (Cross-Device Sync)

### When Internet Is Available
Supabase Realtime carries **event messages** between devices (NOT data).

```
┌──────────────┐                    ┌──────────────┐
│  Counter PC   │  Supabase Realtime │  Kitchen      │
│  (Device A)   │  ──────────────→   │  Tablet       │
│               │  ←──────────────   │  (Device B)   │
│  SQLite DB    │  Event messages:   │  SQLite DB    │
│  (local data) │  • KOT created     │  (local data) │
│               │  • Item ready      │               │
│               │  • Table freed     │               │
└──────────────┘                    └──────────────┘
```

### What Syncs Online
- ✅ Counter sends KOT → Kitchen tablet sees it instantly
- ✅ Kitchen marks item ready → Counter sees update
- ✅ Counter frees table → Kitchen removes ticket
- ❌ Data does NOT sync (each device has its own database)

### What Does NOT Need Internet
- Login → checks local SQLite
- Create order → saved in local SQLite
- Generate bill → saved in local SQLite
- Print KOT/Bill → local printer
- Reports → reads local SQLite
- License → hardcoded in source code

---

## DEPLOYMENT GUIDE

### Option 1: Desktop App (.exe) — RECOMMENDED for restaurants
```
├── Runs 100% offline
├── SQLite database on the PC
├── Server runs inside Electron
├── Supabase Realtime syncs to kitchen tablet (if online)
└── Build: double-click build-exe.bat on Windows
```

### Option 2: Local Server (dev/testing)
```
├── Runs 100% offline
├── SQLite database in /db folder
├── Server runs via `bun run dev`
├── Open http://localhost:3000 in browser
└── Counter + Kitchen on same device (switch tabs)
```

### Option 3: Vercel Hosted + APK
```
├── NEEDS Supabase PostgreSQL (SQLite doesn't work on Vercel)
├── Server on Vercel
├── Database on Supabase
├── APK calls Vercel server
├── Set NEXT_PUBLIC_API_URL to Vercel URL for APK
└── NOT offline — needs internet for everything
```

---

## DATABASE

### Desktop / Local (SQLite — OFFLINE PRIORITY)
```
DATABASE_URL=file:./db/custom.db
```
- File stored on device
- Auto-seeds on first launch
- No setup needed

### Vercel / Hosted (Supabase PostgreSQL — ONLINE ONLY)
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
```
- Run `download/supabase-migration.sql` in Supabase SQL Editor
- Works on Vercel + APK

---

## AUTO-SEED (Fixes "Unexpected end of JSON input")

On first launch, `/api/auto-seed` runs automatically:
1. Checks if database has shops
2. If empty → creates 2 shops, 37 menu items, 11 tables, super admin, 20 license keys
3. If has data → does nothing

This means:
- Fresh .exe → auto-seeds → login works immediately
- Fresh dev setup → auto-seeds → login works immediately
- No manual SQL migration needed for local/desktop

---

## SUPABASE REALTIME (Cross-Device Sync)

### Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://bepwybrooyosdlkajrro.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_tMersYw5hCcLpS4fjNHzYA_kzNjCrgO
```

### How It Works
- Each shop has a channel: `shop-{shopId}`
- Counter broadcasts: `kot:new`, `table:occupied`, `table:released`
- Kitchen broadcasts: `item:status` (preparing/ready)
- Both devices must be online for sync
- If offline, each device works independently with its own SQLite

### No Supabase Setup Needed
- Supabase is used ONLY for Realtime channels (event broadcasting)
- No tables needed in Supabase
- No SQL migration needed for Supabase
- Just the URL + publishable key in .env

---

## LICENSE KEYS (One-Time Use)

### How It Works
1. Keys are hardcoded in `src/lib/license-keys.ts` — work offline
2. On activation, key + expiry stored in:
   - SQLite database (local)
   - Browser localStorage (backup for Vercel)
3. One-time use: once activated, blocked from reuse
4. 365 days validity from activation date

### Your 20 Keys
```
SSYNC-PVKN-9U9R-HDCR    SSYNC-CW5J-CJY2-4N35
SSYNC-L2U4-6QND-DZ2D    SSYNC-DV2E-YNQB-UESS
SSYNC-QNQG-25HG-LMXK    SSYNC-RW8Y-2X3R-QAK5
SSYNC-4GTM-DJ4T-TQ5H    SSYNC-YX9E-VAFG-A438
SSYNC-VZ4Y-7XAD-6JJF    SSYNC-YBBG-AWF4-8SJB
SSYNC-3H2E-RUFH-5YEE    SSYNC-JLFC-KR6V-7HE3
SSYNC-EPNX-49ZJ-ZUNP    SSYNC-L2XC-NJMB-U7EG
SSYNC-CQ26-NQ4P-EXHG    SSYNC-H36K-RD2Y-5XGW
SSYNC-NYM5-UHGD-257M    SSYNC-JFF9-N789-YGJ2
SSYNC-8E6P-CPJ8-SH6Q    SSYNC-3PAZ-HBEE-WAYR
```

---

## LOGIN

```
Email:    super@servingsync.com
Password: admin123
```

Works offline — checks local SQLite database.
