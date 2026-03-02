# Dine At Night — Developer Guide

> Technical reference for developers working on the Dine At Night platform.

---

## Table of Contents

1. [Prerequisites & Local Setup](#1-prerequisites--local-setup)
2. [Project Architecture](#2-project-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Environment Variables](#4-environment-variables)
5. [Key Systems](#5-key-systems)
   - [Firebase & Firestore](#51-firebase--firestore)
   - [Stock Management Model](#52-stock-management-model)
   - [Payment Flow (Paystack)](#53-payment-flow-paystack)
   - [Email System (EmailJS)](#54-email-system-emailjs)
   - [Authentication](#55-authentication)
   - [Real-time Subscriptions](#56-real-time-subscriptions)
6. [Firestore Schema](#6-firestore-schema)
7. [API Routes](#7-api-routes)
8. [Admin Access Control](#8-admin-access-control)
9. [Component Patterns](#9-component-patterns)
10. [Deployment](#10-deployment)
11. [Common Gotchas](#11-common-gotchas)

---

## 1. Prerequisites & Local Setup

### Requirements

- **Node.js** 20+ (LTS)
- **npm** 10+
- A Firebase project with Firestore + Auth enabled
- A Paystack account (test keys for local dev)
- An EmailJS account with templates configured

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd dineatnight
npm install

# 2. Create environment file
cp .env.example .env.local
# Fill in all values (see Section 4)

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Production build — run this before deploying |
| `npm start` | Start production server locally |
| `npm run lint` | ESLint check |

---

## 2. Project Architecture

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server and client components, API routes |
| **Language** | TypeScript 5 | Strict mode enabled |
| **Styling** | Tailwind CSS 4 | Utility-first; no component library for layout |
| **UI / Animation** | Framer Motion, Lucide React, Shadcn/ui | Shadcn used for dialogs, buttons |
| **Backend / DB** | Firebase Firestore + Auth | Real-time document DB; no custom backend |
| **Payments** | Paystack | Webhook-driven; server-side verification |
| **Email** | EmailJS | Client-side; no server needed |
| **QR Codes** | `qrcode` (generate) + `html5-qrcode` (scan) | |
| **Excel Export** | XLSX | Admin ticket export |
| **Deployment** | Vercel | Automatic on push to `main` |

---

## 3. Directory Structure

```
app/
├── (home)/home/         # Landing page
├── aboutUs/             # About page
├── event/               # Event detail page
├── gallery/             # Photo/video gallery with lightbox
├── shop/                # Merchandise shop
│   ├── page.tsx         # Shop listing with cart drawer
│   └── verify/          # Post-purchase confirmation + delivery tracker
├── cart/                # Legacy cart route (redirects to shop)
├── tickets/[ref]/       # E-ticket page with QR code
├── vendors/             # Vendor directory + application modal
├── contact/             # Contact form
├── admin/               # Admin dashboard (protected)
│   ├── page.tsx         # Dashboard overview stats
│   ├── login/           # Admin login
│   ├── events/          # Event management
│   ├── vendors/         # Vendor application review
│   ├── gallery/         # Gallery management
│   ├── shop/            # Product management
│   ├── orders/          # Order delivery management
│   ├── tickets/         # Ticket viewer + XLSX export
│   ├── testimonials/    # Testimonial moderation
│   └── confirm/         # Gate QR scanner
├── _components/         # Shared components (Navbar, Footer, etc.)
└── api/                 # Next.js API routes
    └── paystack/
        ├── initialize/  # Ticket payment init
        ├── verify/      # Ticket payment verify
        ├── merch/
        │   ├── initialize/  # Merch payment init + server-side stock check
        │   └── verify/      # Merch payment verify + Firestore order creation
        └── webhook/     # Paystack webhook receiver

lib/
├── firebase.ts          # Firebase app init (singleton)
├── firestore.ts         # All Firestore read/write helpers
├── emailjs.ts           # EmailJS send helpers
├── cache.ts             # In-memory TTL cache (reduces Firestore reads)
├── rateLimit.ts         # Client-side rate limiter (contact form)
└── useScrollLock.ts     # Body scroll-lock hook (modals)
```

---

## 4. Environment Variables

All variables must be set in `.env.local` (local) and in Vercel project settings (production).

```env
# Firebase (client-safe — all NEXT_PUBLIC)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=   # Used client-side to init payment popup
PAYSTACK_SECRET_KEY=               # Server-only — never expose to client

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000/

# Admin
NEXT_PUBLIC_ADMIN_EMAILS=admin@dineatnight.com  # Comma-separated for multiple admins

# EmailJS (client-safe — all NEXT_PUBLIC)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE=   # Vendor status notifications
NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE=   # Ticket/order confirmations
```

> `PAYSTACK_SECRET_KEY` is **server-only**. Never prefix it with `NEXT_PUBLIC_`. It is used in API routes only.

---

## 5. Key Systems

### 5.1 Firebase & Firestore

Firebase is initialised once in `lib/firebase.ts` and exported as `db` (Firestore), `auth` (Firebase Auth), and `app`.

All Firestore operations are centralised in `lib/firestore.ts`. Do not make Firestore calls directly from page components — use or add a helper there.

The `lib/cache.ts` module wraps common read operations with a short TTL (5 minutes by default). Writes always call `clearCache(key)` to invalidate stale data.

### 5.2 Stock Management Model

This is the most critical data integrity concern in the shop.

**Two fields on every product document:**

| Field | Type | Meaning |
|---|---|---|
| `stock` | `number` | **Total capacity** — the physical number of units you own. `-1` = unlimited. **Never modified by purchases.** |
| `soldCount` | `number` | **Units sold** — incremented on purchase, decremented on return. Managed automatically. |

**Available units** = `stock - soldCount`

**Rules:**
- `stock` is set manually by admins. It only changes if you restock (add new units).
- `soldCount` is managed exclusively by the purchase and return flows — never edit it manually.
- A product is "Sold Out" when `stock !== -1 && stock - soldCount <= 0`.

**Code locations:**
- Stock checked + `soldCount` incremented: `app/api/paystack/merch/verify/route.ts` (inside `runTransaction`)
- Stock restored on return: `lib/firestore.ts` → `restockReturnedOrder` (decrements `soldCount`)
- Undo of a return: `lib/firestore.ts` → `reapplyOrderSoldCount` (increments `soldCount` back)
- Called from: `app/admin/orders/page.tsx` → `handleDelivery`

### 5.3 Payment Flow (Paystack)

#### Ticket Payments

```
User → /api/paystack/initialize → Paystack popup
      → Paystack redirects to /tickets/[reference]
      → page calls /api/paystack/verify
      → verify checks payment, creates Firestore ticket doc
```

#### Merch Payments

```
User → /api/paystack/merch/initialize
      → server-side stock check (runTransaction — reserves units)
      → Paystack popup
      → Paystack redirects to /shop/verify?reference=...
      → page calls /api/paystack/merch/verify
      → verify confirms payment, creates Firestore order doc, increments soldCount
```

> The merch initialize route does a **pre-flight stock check** before Paystack is opened. This prevents users from paying for items that are already sold out. The verify route does a **second atomic check** (idempotent) using `runTransaction`.

### 5.4 Email System (EmailJS)

All emails are sent **client-side** using `lib/emailjs.ts`. No server or backend email service is required.

EmailJS templates used:
- **Notification template** (`NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE`) — vendor status updates (approve / decline / revoke)
- **Confirmation template** (`NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE`) — ticket and order confirmations, newsletter welcome

> EmailJS has a free-tier send limit. Monitor usage in the EmailJS dashboard. For high-volume needs, consider migrating to a server-side solution (Resend, SendGrid).

### 5.5 Authentication

Admin authentication uses **Firebase Auth** (email/password).

After login, the user's email is checked against `NEXT_PUBLIC_ADMIN_EMAILS` (a comma-separated env var). If their email is not in the list, they are redirected to `/admin/login` even if Firebase Auth succeeds.

Admin route protection is handled in each admin page's `useEffect` — there is no middleware-level protection. This means the check happens client-side after page load.

### 5.6 Real-time Subscriptions

Several pages use Firestore `onSnapshot` for live updates:

- **Shop page** — `subscribeAllProducts` in `lib/firestore.ts` — live product stock levels. Used to auto-remove sold-out items from cart.
- **Admin orders** — live order list subscription
- **Admin tickets** — live ticket list subscription
- **Shop verify page** — live order status for delivery tracker

Pattern:
```typescript
useEffect(() => {
  const unsub = subscribeToCollection((data) => setState(data));
  return () => unsub(); // Always clean up
}, []);
```

---

## 6. Firestore Schema

### `events` collection
```
{
  title: string
  edition: string
  date: Timestamp
  venue: string
  description: string
  status: "draft" | "active" | "ended"
  imageUrl: string
  highlights: string[]
  baseTicketPrice: number
  totalTickets: number
  soldTickets: number          // Denormalised counter (may lag actual)
  isPast: boolean
  ticketTypes: { name, price, limit? }[]
  sponsors: { name, logo }[]
}
```

### `tickets` collection
```
{
  eventId: string
  eventTitle: string
  name: string
  email: string
  phone: string
  ticketType: string
  qty: number
  amount: number
  reference: string            // Paystack reference
  status: "paid" | "pending"
  scanned: boolean
  createdAt: Timestamp
}
```

### `products` collection
```
{
  name: string
  price: number
  category: "T-Shirts" | "Hoodies" | "Caps" | "Tote Bags" | "Stickers" | "Limited"
  description: string
  imageUrl: string
  accent: "yellow" | "green" | "red"
  isLimited: boolean
  stock: number                // Total units (-1 = unlimited)
  soldCount: number            // Units sold — managed by purchase/return flows
  active: boolean
}
```

### `orders` collection
```
{
  reference: string            // Paystack reference
  name: string
  email: string
  phone: string
  address: string
  items: { productId, productName, price, qty }[]
  total: number
  deliveryStatus: "pending" | "dispatched" | "delivered" | "returned"
  statusHistory: { status, timestamp, note }[]
  createdAt: Timestamp
}
```

### `vendors` collection
```
{
  brandName: string
  ownerName: string
  email: string
  phone: string
  instagram: string
  categories: string[]
  eventId: string
  description: string
  imageUrl: string
  logoUrl?: string
  menu: { category: string, items: { name, price }[] }[]
  status: "pending" | "approved" | "declined"
  createdAt: Timestamp
}
```

### `gallery` collection
```
{
  eventId: string
  type: "photo" | "video"
  url: string
  caption: string
  createdAt: Timestamp
}
```

### `testimonials` collection
```
{
  name: string
  type: "vendor" | "attendee" | "team"
  role: string
  quote: string
  eventId?: string
  source: "admin" | "user"
  createdAt: Timestamp
}
```

### `subscribers` collection
```
{
  email: string
  subscribedAt: Timestamp
}
```

---

## 7. API Routes

All routes are under `app/api/`.

| Route | Method | Description |
|---|---|---|
| `/api/paystack/initialize` | POST | Create Paystack transaction for ticket purchase |
| `/api/paystack/verify` | GET | Verify ticket payment, create ticket doc in Firestore |
| `/api/paystack/merch/initialize` | POST | Server-side stock check + create Paystack transaction for merch |
| `/api/paystack/merch/verify` | GET | Verify merch payment, create order doc, increment soldCount |
| `/api/paystack/webhook` | POST | Paystack webhook receiver (validates HMAC signature) |

> All Paystack API calls use `PAYSTACK_SECRET_KEY` from the server environment. The secret key is never sent to the client.

---

## 8. Admin Access Control

Admin access requires two conditions to both be true:

1. **Firebase Auth** — user is logged in with a valid account
2. **Email whitelist** — `process.env.NEXT_PUBLIC_ADMIN_EMAILS` contains their email (comma-separated)

To add an admin:
1. Create a Firebase Auth account (Firebase Console → Authentication → Add User)
2. Add their email to `NEXT_PUBLIC_ADMIN_EMAILS` in Vercel
3. Redeploy (env vars require a new deployment to take effect)

To remove an admin:
1. Remove their email from `NEXT_PUBLIC_ADMIN_EMAILS` → redeploy
2. Disable or delete their Firebase Auth account

> Sessions are not instantly revoked — existing sessions persist until the Firebase token expires (up to 1 hour) or the user signs out.

---

## 9. Component Patterns

### Hydration-Safe Client State

For components that read from `localStorage` (e.g. cart count in the nav), use a `mounted` guard to avoid server/client HTML mismatch:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

// Only render dynamic client content after mount
{mounted && cartCount > 0 && <Badge>{cartCount}</Badge>}
```

### Scroll Lock (Modals)

Use the `useScrollLock` hook from `lib/useScrollLock.ts` whenever a full-screen modal or drawer is open:

```tsx
import { useScrollLock } from "@/lib/useScrollLock";
useScrollLock(isModalOpen);
```

### Rate Limiting

For user-facing forms (contact, newsletter), use `lib/rateLimit.ts` to prevent spam submissions:

```typescript
import { checkRateLimit } from "@/lib/rateLimit";
const allowed = checkRateLimit("contact-form", 60); // 60-second cooldown
if (!allowed) return; // Show error to user
```

### Firestore Cache

Use `lib/cache.ts` for one-time reads that don't need real-time updates:

```typescript
import { getFromCache, setInCache } from "@/lib/cache";
const cached = getFromCache<Product[]>("dan_products");
if (cached) return cached;
// ... fetch from Firestore
setInCache("dan_products", data, 300); // 5-minute TTL
```

Always call `clearCache(key)` after writes to prevent stale reads.

---

## 10. Deployment

The project is deployed on **Vercel**. Pushing to `main` triggers an automatic production build.

### Deployment Checklist

- [ ] All environment variables set in Vercel → Settings → Environment Variables
- [ ] `PAYSTACK_SECRET_KEY` is server-only (no `NEXT_PUBLIC_` prefix)
- [ ] Paystack webhook URL points to `https://dineatnight.com/api/paystack/webhook`
- [ ] Paystack webhook secret matches `PAYSTACK_SECRET_KEY`
- [ ] Firebase rules are set to protect sensitive collections
- [ ] Run `npm run build` locally before pushing to catch type errors

### Vercel Project Settings

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` (auto-detected) |
| Node.js Version | 20.x |

---

## 11. Common Gotchas

### TypeScript: `React.ElementType` without React import

If you use `React.ElementType` as a type in a file that doesn't import `React` as a namespace, TypeScript infers component props as `never`. Use the specific type instead:

```typescript
// Bad — React not imported as namespace
icon: React.ElementType

// Good — import the type directly
import { type LucideIcon } from "lucide-react";
icon: LucideIcon
```

### Firestore Timestamps in Date Comparisons

Firestore `Timestamp` objects are not native JS `Date` objects. Always convert:

```typescript
const date = (doc.createdAt as Timestamp).toDate();
```

### Next.js `"use client"` + `localStorage`

`localStorage` is undefined during SSR. Guard with `typeof window !== "undefined"` or use a `mounted` state (see Section 9).

### Paystack Webhook vs. Redirect

Do not rely solely on the Paystack redirect for payment confirmation. The redirect can fail (user closes browser, network drop). The webhook (`/api/paystack/webhook`) is the authoritative confirmation channel — it fires regardless of redirect success.

### Cart and Real-time Stock

The shop page uses a Firestore `onSnapshot` subscription (`subscribeAllProducts`) to get live product data. The auto-cleanup `useEffect` watches this data and removes sold-out items from the cart. This means the cart state can change while the user is on the shop page — this is intentional.

### `soldCount` Never Goes Below 0

Both `restockReturnedOrder` and `reapplyOrderSoldCount` use `runTransaction` for atomicity. `restockReturnedOrder` uses `Math.max(0, soldCount - qty)` to prevent negative values.

### Admin Env Var Changes Require Redeploy

`NEXT_PUBLIC_ADMIN_EMAILS` is baked into the client bundle at build time. Adding or removing an admin email requires a new Vercel deployment to take effect.

---

*Last updated: March 2026 | Dine At Night*
