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
PHASE A — Demo Ready ✅ Complete

## What Was Built
- GAP 6: Table QR generator in admin panel
- GAP 3: Menu images (Unsplash, 34 items, auto-find in admin)
- GAP 2: Stripe card payments (PaymentIntent, webhook, StripeCheckout component)
- Bestellboard: dark floating panel with AI suggestions
- All pipeline bugs fixed:
  - Individual: no table popup, skip pay my bill, cash triggers Telegram, card confirmation
  - Group: host sees group bill, AI suggestions, cash triggers Telegram

## Next Phase
PHASE B — SaaS Ready
- GAP 1: Kitchen Display System
- GAP 4: Multi-restaurant onboarding
- GAP 5: Analytics dashboard

## Live URLs
Customer (individual or host): https://restaurant-os-one.vercel.app/demo/menu/[1-6]
Guest join: https://restaurant-os-one.vercel.app/demo/join/[groupCode]
Staff: https://restaurant-os-one.vercel.app/demo/staff
Admin: https://restaurant-os-one.vercel.app/demo/admin
Stripe test card: 4242 4242 4242 4242 exp:12/34 cvc:123

## Key Files
- src/app/[slug]/menu/[tableNumber]/page.tsx — customer menu (host + individual)
- src/app/[slug]/guest/[sessionId]/[seatId]/page.tsx — guest menu (no pay)
- src/app/[slug]/join/[groupCode]/page.tsx — group join page
- src/components/customer/SessionSetup.tsx — dining type selector
- src/components/customer/PaymentModal.tsx — individual payment modes
- src/components/customer/GroupBillModal.tsx — host group bill payment
- src/components/customer/Bestellboard.tsx — dark floating panel: orders, AI upsell, call waiter, pay
- src/components/customer/GroupQRCode.tsx — scannable QR for group join
- src/app/api/sessions/route.ts — session management (tableId + groupCode lookup)
- src/app/api/sessions/pay/route.ts — payment processing + Telegram notification
- src/app/api/ai-suggest/route.ts — Anthropic API upsell suggestions
- src/app/api/call-waiter/route.ts — Telegram waiter call
- src/lib/telegram.ts — notifications
- src/lib/db.ts — database client
