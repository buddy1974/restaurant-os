# restaurant-os — Claude Code Project Context

## Project Overview

A multi-tenant restaurant operating system built with Next.js App Router.
Customers scan a QR code at their table, browse the menu, place orders, and request payment — all without staff interaction. Staff and admin views are separate route groups.

## Working Directory

`C:\Users\loneb\Documents\ai-software-dev\projects\restaurant-os`

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Framework    | Next.js 16 (App Router)           |
| Language     | TypeScript                        |
| Styling      | Tailwind CSS v4                   |
| Database     | Supabase (PostgreSQL)             |
| Hosting      | Vercel                            |
| DNS / CDN    | Cloudflare                        |
| Email        | Resend                            |

## Folder Structure

```
src/
├── app/
│   ├── (customer)/menu/[tableId]/   # Customer-facing menu + ordering
│   ├── (staff)/                     # Staff view: live orders, table status
│   ├── (admin)/                     # Admin: menu management, reports
│   └── api/
│       ├── orders/                  # Order CRUD
│       ├── sessions/                # Table session management
│       ├── tables/                  # Table status
│       └── menu/                   # Menu items + categories
├── components/
│   ├── customer/                    # Customer UI components
│   ├── staff/                       # Staff UI components
│   └── ui/                          # Shared primitives
├── lib/                             # Supabase client, utilities
├── types/                           # Central TypeScript types (index.ts)
└── hooks/                           # Custom React hooks
```

## Central Types

All types are defined in `src/types/index.ts`. Import from there — do not redefine locally.

Key types: `Restaurant`, `Table`, `MenuCategory`, `MenuItem`, `TableSession`, `Order`, `OrderItem`

Key enums: `TableStatus`, `SessionStatus`, `OrderStatus`, `PaymentMethod`, `PaymentStatus`

## Route Groups

- `(customer)` — public, no auth required, accessed via QR code URL
- `(staff)` — requires staff auth
- `(admin)` — requires admin auth

## Coding Rules

- TypeScript only — no plain JS
- Tailwind CSS only — no inline styles, no CSS files unless required
- Functional components + React hooks
- `async/await` throughout
- No `any` type
- Handle loading and error states in every component
- Reuse Supabase client from `src/lib/`
- Secrets in `.env.local` only

## Workflow

1. Enter plan mode for any task > 3 steps
2. Confirm plan before coding
3. Run `npx tsc --noEmit` and `npm run build` before marking done
4. Check logs, API, auth, and DB after changes

## Environment Variables (to be added)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Demo Data

Restaurant slug: demo
Restaurant ID: d61266a3-cdb1-4aab-9899-85e5cb85e8b1
Tables: 1 through 6
Categories: Starters, Main Dishes, Drinks, Desserts
Menu items: 12 items seeded
Payment methods: cash, card
Seat codes: fruit-based (APPLE, MANGO, BANANA, PINEAPPLE, STRAWBERRY, ORANGE, GRAPE, PEACH, CHERRY, LEMON, MELON, KIWI, PAPAYA, LYCHEE, GUAVA, COCONUT, BERRY, PLUM, FIG, LIME)
Test URL when running locally: http://localhost:3000/menu/1

## Current Build Phase
PHASE 0 — Foundation ✅ Complete
PHASE 1 — Customer Flow ✅ Complete
PHASE 2 — Staff Dashboard ✅ Complete
PHASE 3 — Admin Panel ✅ Complete
PHASE 4 — Seat System ✅ Complete

## What Was Just Built
- Fruit-based seat codes (20 fruits)
- Session type system (individual vs group)
- SessionSetup screen shown on first scan
- PaymentModal with 4 modes (unit, group, split_equal, split_select)
- Payment modes filtered by session type
- Telegram notifications on every order
- Staff sees session type badge (👤 / 👨‍👩‍👧)

## Next Steps
- Test session type flow end to end on live site
- Phase 5: Stripe card payments
- Phase 6: Multi-tenant onboarding

## Live URLs
Customer: https://restaurant-os-one.vercel.app/demo/menu/1
Staff: https://restaurant-os-one.vercel.app/demo/staff
Admin: https://restaurant-os-one.vercel.app/demo/admin

## Key Files
- src/app/[slug]/menu/[tableNumber]/page.tsx — customer menu
- src/components/customer/SessionSetup.tsx — dining type selector
- src/components/customer/PaymentModal.tsx — payment modes
- src/app/(staff)/[slug]/staff/page.tsx — staff dashboard
- src/app/(admin)/[slug]/admin/page.tsx — admin panel
- src/lib/telegram.ts — notifications
- src/lib/db.ts — database client
