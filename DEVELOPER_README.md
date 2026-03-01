# Dine At Night — Developer Guide

> Lagos' first nighttime food market platform.
> Stack: **Next.js 16 · React 19 · Firebase 12 · Tailwind CSS 4 · Framer Motion 12 · EmailJS · Paystack**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Environment Variables](#3-environment-variables)
4. [Project Structure](#4-project-structure)
5. [Routing & Pages](#5-routing--pages)
6. [Data Layer — Firestore](#6-data-layer--firestore)
7. [Authentication & Security](#7-authentication--security)
8. [Payment Integration — Paystack](#8-payment-integration--paystack)
9. [Email System — EmailJS](#9-email-system--emailjs)
10. [State Management Patterns](#10-state-management-patterns)
11. [Caching Strategy](#11-caching-strategy)
12. [Component Architecture](#12-component-architecture)
13. [Design System](#13-design-system)
14. [Admin Panel Architecture](#14-admin-panel-architecture)
15. [API Routes](#15-api-routes)
16. [Performance Patterns](#16-performance-patterns)
17. [Known Limitations & Future Work](#17-known-limitations--future-work)
18. [Local Development Setup](#18-local-development-setup)

---

## 1. Project Overview

Dine At Night is a full-stack Next.js web application serving as the official platform for the Dine At Night nighttime food market in Lagos. It handles:

- **Public website** — event listings, vendor directory, gallery, shop, contact, newsletter
- **Ticketing** — Paystack-powered ticket purchase + QR e-ticket generation + gate scanning
- **Merch shop** — product listings, cart, Paystack checkout, order delivery tracking
- **Vendor applications** — multi-step form, admin review workflow, automated status emails
- **Admin panel** — full CRUD for events, tickets, vendors, gallery, testimonials, products, orders

---

## 2. Tech Stack & Dependencies

### Core Framework
| Package | Version | Purpose |
|---|---|---|
| `next` | 16.1.6 | App Router, server components, API routes, middleware |
| `react` / `react-dom` | 19.2.3 | UI, concurrent features, React compiler |
| `typescript` | ^5 | Type safety throughout |

### Database & Auth
| Package | Version | Purpose |
|---|---|---|
| `firebase` | ^12.9.0 | Firestore (database) + Firebase Auth (admin login) |

### UI & Animation
| Package | Version | Purpose |
|---|---|---|
| `framer-motion` | ^12.33.0 | Page transitions, scroll animations, modals, carousels |
| `lucide-react` | ^0.563.0 | All icons |
| `tailwindcss` | ^4 | Utility-first CSS |
| `tailwind-merge` | ^3.4.0 | Safe class merging (no conflicts) |
| `clsx` | ^2.1.1 | Conditional classnames |
| `class-variance-authority` | ^0.7.1 | Component variant system |
| `radix-ui` | ^1.4.3 | Accessible headless primitives |
| `tw-animate-css` | ^1.4.0 | Extended Tailwind animations |

### 3D / WebGL
| Package | Version | Purpose |
|---|---|---|
| `@react-three/fiber` | ^9.5.0 | React wrapper for Three.js |
| `three` | ^0.167.1 | 3D WebGL particle field (home page hero) |
| `ogl` | ^1.0.11 | Lightweight WebGL orb component |

### Payments & Communication
| Package | Version | Purpose |
|---|---|---|
| `@emailjs/browser` | ^4.4.1 | Client-side email (no server needed) |
| Paystack (REST API) | — | Payment processing (server-side API calls) |

### Admin Utilities
| Package | Version | Purpose |
|---|---|---|
| `html5-qrcode` | ^2.3.8 | Camera QR scanning (admin ticket gate) |
| `qrcode` | ^1.5.4 | QR code generation (e-ticket) |
| `xlsx` | ^0.18.5 | Excel export of admin data |

### React Compiler
`babel-plugin-react-compiler` is enabled via `reactCompiler: true` in `next.config.ts`. This automatically memoizes components and values — do **not** manually add `useMemo`/`useCallback` unless you have a measured performance reason.

---

## 3. Environment Variables

All secrets are in `.env.local` (never committed to git).

### Client-safe (`NEXT_PUBLIC_*`)
These are bundled into the browser. Never put secrets here.

```env
# Firebase (client SDK)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=   # optional

# EmailJS
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE=   # Template 1 → admin inbox
NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE=   # Template 2 → user {{to_email}}

# App
NEXT_PUBLIC_APP_URL=https://dineatnight.com   # No trailing slash
```

### Server-only (never sent to browser)
```env
PAYSTACK_SECRET_KEY=sk_live_...
ADMIN_EMAILS=hello@dineatnight.com,admin@dineatnight.com   # comma-separated
```

### Adding a new variable
- If needed by client-side code → prefix `NEXT_PUBLIC_`
- If a secret (API key, signing key) → never prefix `NEXT_PUBLIC_`
- Add it to `.env.local` and also to Vercel → Settings → Environment Variables
- For EmailJS vars: add the dev-mode `console.warn` already handles missing vars

---

## 4. Project Structure

```
dineatnight/
├── app/                        # Next.js 16 App Router
│   ├── (home)/home/            # Route: /home  (route group for layout isolation)
│   ├── _components/            # Shared components used by public pages
│   ├── aboutUs/                # Route: /aboutUs
│   ├── admin/                  # Route: /admin/* (auth-gated)
│   │   ├── _components/        # Admin-only components
│   │   ├── confirm/            # Gate scanning page
│   │   ├── events/             # Event CRUD
│   │   ├── gallery/            # Gallery management
│   │   ├── login/              # Admin login
│   │   ├── orders/             # Merch order management
│   │   ├── shop/               # Product management
│   │   ├── testimonials/       # Testimonial management
│   │   ├── tickets/            # Ticket viewer
│   │   ├── vendors/            # Vendor review
│   │   ├── layout.tsx          # Admin shell (auth check, sidebar, nav)
│   │   └── page.tsx            # Dashboard
│   ├── api/                    # Server-side API routes
│   │   ├── admin/session/      # POST/DELETE — login/logout cookie
│   │   ├── paystack/
│   │   │   ├── initialize/     # POST — ticket payment init
│   │   │   ├── verify/         # GET — ticket payment verify
│   │   │   ├── webhook/        # POST — Paystack HMAC webhook
│   │   │   └── merch/
│   │   │       ├── initialize/ # POST — merch payment init
│   │   │       └── verify/     # GET — merch payment verify
│   │   └── subscribe/          # POST — newsletter subscribe
│   ├── contact/                # Route: /contact
│   ├── event/                  # Route: /event
│   ├── gallery/                # Route: /gallery
│   ├── shop/                   # Route: /shop
│   │   └── verify/             # Route: /shop/verify (post-payment)
│   ├── tickets/
│   │   ├── [reference]/        # Route: /tickets/:reference (e-ticket)
│   │   └── verify/             # Route: /tickets/verify (post-payment)
│   ├── vendors/                # Route: /vendors
│   ├── error.tsx               # Global error boundary
│   ├── globals.css             # Tailwind base + global styles
│   ├── layout.tsx              # Root layout (font, Navbar)
│   ├── page.tsx                # "/" → redirects to /home
│   └── sitemap.ts              # Auto sitemap for SEO
├── assets/
│   ├── images/                 # Static assets (logo, clothes.jpg)
│   └── images.ts               # Barrel: exports Images() hook → { logo, logoText }
├── components/                 # Visual / WebGL components
│   ├── Antigravity.tsx         # Three.js particle field (home hero)
│   ├── DoodleBg.tsx
│   ├── Grainient.tsx
│   └── Orb.tsx                 # OGL WebGL orb
├── lib/
│   ├── cache.ts                # localStorage 10-min TTL cache
│   ├── emailjs.ts              # All email functions (notify + confirm)
│   ├── firebase.ts             # Firebase init, db export, getAuthClient()
│   ├── firestore.ts            # All Firestore types + CRUD functions
│   ├── rateLimit.ts            # In-process rate limiter
│   ├── useScrollLock.ts        # Hook: lock body scroll when modal open
│   └── utils.ts                # cn() utility
├── middleware.ts               # Edge: protects /admin/* with cookie check
├── next.config.ts              # React compiler, image domains
└── package.json
```

---

## 5. Routing & Pages

### Public Routes
| Route | Description |
|---|---|
| `/` | Redirect → `/home` |
| `/home` | Main landing page. Hero, active events, vendor preview, gallery, testimonials, newsletter |
| `/event` | Full event listing. Active + past events, ticket purchase flow, countdown timers |
| `/vendors` | Vendor directory. Category filter, vendor cards, detail modal with menu & images |
| `/gallery` | Media gallery. Masonry grid, event filter, media type filter, lightbox, video player |
| `/aboutUs` | About page. Mission, stats counter, team, vendor apply CTA |
| `/contact` | Contact form. 6 topic options, rate-limited (60s), honeypot field |
| `/shop` | Merch shop. Category tabs, 3D tilt cards, cart drawer, Paystack checkout |
| `/shop/verify` | Post-payment confirmation. Reads `?reference=`, shows order summary |
| `/tickets/[reference]` | E-ticket. QR code, event details, sponsors. Shareable link |
| `/tickets/verify` | Post-payment for tickets. Reads `?reference=`, sends email, → e-ticket |

### Admin Routes (auth-gated)
| Route | Description |
|---|---|
| `/admin/login` | Email/password login → httpOnly session cookie |
| `/admin` | Dashboard. Stats, recent events, orders, tickets |
| `/admin/events` | Event CRUD (create, edit, delete, publish) |
| `/admin/tickets` | Ticket viewer per event. Scanned/unscanned tabs |
| `/admin/vendors` | Vendor review. Approve/decline/revoke with email notifications |
| `/admin/confirm` | Gate scanner. Manual reference or QR camera scan |
| `/admin/gallery` | Gallery management. Add/delete photos and videos per event |
| `/admin/testimonials` | Testimonial CRUD |
| `/admin/shop` | Product CRUD. Toggle active/inactive |
| `/admin/orders` | Order management. Delivery status workflow with audit trail |

---

## 6. Data Layer — Firestore

All data access is in `lib/firestore.ts`. Never write Firestore calls directly in page components.

### Collections

#### `events`
```typescript
interface DanEvent {
  id?: string;
  title: string;
  edition: string;
  date: Timestamp;
  venue: string;
  description: string;
  isPast: boolean;
  ticketPrice: number;           // Naira, legacy/base price
  ticketTypes?: DanTicketType[]; // Multi-tier: [{ name, price, limit? }]
  totalTickets: number;
  soldTickets: number;           // Incremented atomically via transaction
  status: "draft" | "active" | "ended";
  imageUrl: string;
  highlights: string[];
  sponsors?: DanSponsor[];       // [{ name, logoUrl }]
  createdAt?: Timestamp;
}
```

#### `tickets`
```typescript
interface DanTicket {
  id?: string;                   // = Paystack reference (set explicitly)
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  ticketType?: string;           // "VIP" | "VVIP" | "General Admission"
  amount: number;                // Kobo (divide by 100 for Naira)
  reference: string;             // Mirrors doc ID
  status: "pending" | "paid" | "confirmed";
  purchasedAt?: Timestamp;
  confirmedAt?: Timestamp | null;
}
```

#### `vendors`
```typescript
interface DanVendor {
  id?: string;
  brandName: string;
  brandNameLower?: string;       // Lowercase for dedup
  ownerName: string;
  email: string;
  phone: string;
  instagram?: string;
  categories?: string[];         // Up to 3 food categories
  events?: string[];             // Event titles vendor applied for
  description: string;
  products?: string;             // Optional (deprecated in favour of menu)
  logoUrl?: string;
  imageUrl: string;              // Primary image
  imageUrls?: string[];          // All images (slideshow)
  status: "pending" | "approved" | "declined";
  declineReason?: string;
  menu?: VendorMenuCategory[];   // Structured menu
  reapplyCount?: number;
  previousSnapshot?: { ... };   // Pre-reapply snapshot for diff
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp | null;
}
```

#### `testimonials`
```typescript
interface DanTestimonial {
  id?: string;
  name: string;
  type: "vendor" | "user" | "admin";
  role: string;
  quote: string;
  eventTitle?: string;
  createdBy: "user" | "admin";
  submittedAt?: Timestamp;
}
```

#### `gallery`
```typescript
interface DanGalleryItem {
  id?: string;
  eventId: string;
  eventTitle: string;
  type: "photo" | "video";
  src: string;                   // Public URL
  caption: string;
  createdAt?: Timestamp;
}
```

#### `products`
```typescript
interface DanProduct {
  id?: string;
  name: string;
  price: number;                 // Naira
  category: "tshirts" | "hoodies" | "caps" | "bags" | "stickers" | "limited";
  description: string;
  imageUrl: string;
  accent: string;                // Hex colour e.g. "#FFFF00"
  limited: boolean;
  soldCount: number;             // Incremented on purchase
  stock: number;                 // -1 = unlimited
  active?: boolean;              // undefined/true = visible; false = hidden
  createdAt?: Timestamp;
}
```

#### `merch_orders`
```typescript
interface DanMerchOrder {
  id?: string;                   // = Paystack reference
  reference: string;
  name: string; email: string; phone: string;
  address?: { street: string; city: string; state: string };
  items: { productId: string; productName: string; price: number; qty: number }[];
  total: number;                 // Naira
  status: "pending" | "paid";
  deliveryStatus: "pending" | "dispatched" | "delivered" | "returned";
  statusNote?: string;
  statusHistory?: { status: string; note: string; changedAt: number }[];
  createdAt?: Timestamp;
}
```

#### `subscribers`
```typescript
// Doc ID = normalised email (lowercase)
{ email: string; subscribedAt: Timestamp }
```

### Real-time Subscriptions
All subscribe functions follow the same pattern and return an unsubscribe function:
```typescript
// Usage in a component
useEffect(() => {
  return subscribeActiveEvents((events) => {
    setActiveEvents(events);
  });
}, []);
```

Available subscriptions:
- `subscribeActiveEvents(cb)` — events where status = "active" and !isPast
- `subscribePastEvents(cb)` — events where isPast = true, ordered by date desc
- `subscribeApprovedVendors(cb)` — vendors where status = "approved"
- `subscribeGalleryItems(cb)` — all gallery items, ordered by createdAt desc
- `subscribeAllProducts(cb)` — all products, ordered by createdAt desc
- `subscribeMerchOrders(cb)` — all merch orders, ordered by createdAt desc
- `subscribeToTestimonials(cb)` — all testimonials ordered by submittedAt desc

### One-time Reads
- `getAllEvents()`, `getAllTickets()`, `getAllVendors()`, `getAllGalleryItems()`
- `getAllTestimonials()`, `getAllProducts()`, `getAllOrders()`
- `getActiveEvents()` — used by VendorModal (event selection dropdown)
- `getVendorCategories()` — distinct categories from approved vendors

### Cache Invalidation
Several write functions call `clearCache(key)` after mutating data so the next page load gets fresh data:
- `updateEvent`, `deleteEvent` → clears `dan_active_events`, `dan_past_events`
- `updateVendorStatus` → clears `dan_approved_vendors`
- `createGalleryItem`, `deleteGalleryItem` → clears `dan_gallery`
- `updateProduct`, `deleteProduct` → clears `dan_products`

---

## 7. Authentication & Security

### Two-Layer Admin Auth

**Layer 1 — Edge Middleware** (`middleware.ts`):
- Runs on every request to `/admin/*` (except `/admin/login`)
- Checks `request.cookies.get("dan_admin")?.value`
- Redirects unauthenticated requests to `/admin/login` before any React code runs
- Fastest possible protection — no Firestore or Firebase Auth calls

**Layer 2 — Firebase Auth** (`app/admin/layout.tsx`):
- `onAuthStateChanged` listener syncs Firebase session
- Belt-and-suspenders: handles Firebase session expiry even if cookie exists
- Both layers must agree for the admin UI to render

### Login Flow (detailed)
```
1. Admin enters email + password
2. signInWithEmailAndPassword(auth, email, password)
3. user.getIdToken() → Firebase ID token (JWT)
4. POST /api/admin/session { idToken }
5. Server: identitytoolkit.googleapis.com/v1/accounts:lookup
   (verifies token with Firebase REST API — no Admin SDK needed)
6. Extracts email from response
7. Checks email in ADMIN_EMAILS env var (server-only, never in browser)
8. Sets httpOnly cookie: dan_admin=1 (24h, sameSite: lax, secure in prod)
9. Client redirects to /admin
```

### Adding a New Admin
Add their email to `ADMIN_EMAILS` in Vercel env vars (comma-separated). They also need a Firebase Auth account created in the Firebase Console.

### Security Measures Implemented
| Measure | Where |
|---|---|
| HMAC-SHA512 webhook verification | `POST /api/paystack/webhook` |
| Server-side price validation (tamper prevention) | `POST /api/paystack/merch/initialize` |
| Rate limiting (10 req/hour per IP) | `POST /api/subscribe` |
| Honeypot field (silent bot drop) | `app/contact/page.tsx` |
| localStorage cooldown (60s) | Contact form |
| httpOnly session cookie | Admin login |
| Server-only `ADMIN_EMAILS` | Never in browser bundle |
| URL param encoding with `URLSearchParams` | `app/shop/verify/page.tsx` |
| `PAYSTACK_SECRET_KEY` — inline guard | `app/api/paystack/merch/verify/route.ts` |
| `Promise.allSettled` | Non-critical parallel email sends |

### Firestore Rules
Firestore Security Rules are managed in the Firebase Console. The general principle:
- Public reads: `events`, `vendors` (approved only), `gallery`, `products` (active only), `testimonials`
- Public writes: `tickets` (create only via server), `vendors` (create/update via VendorModal), `testimonials` (create only), `subscribers` (create only)
- Admin-only: all deletes, status updates, event CRUD

> **Important**: Client-side Firestore calls exist (VendorModal, TestimonialSection). Firestore Security Rules are your last line of defence. Keep them tight.

---

## 8. Payment Integration — Paystack

### Ticket Flow
```
User → POST /api/paystack/initialize
  → Validates input server-side
  → Calls Paystack /transaction/initialize (with metadata)
  → createPendingTicket() → Firestore tickets/{reference}
  → Returns { authorization_url }
User → Paystack hosted checkout (external)
Paystack → POST /api/paystack/webhook (HMAC verified)
  → markTicketPaid(reference, eventId, qty) [idempotent Firestore transaction]
Paystack → GET /tickets/verify?reference={ref}
  → GET /api/paystack/verify
  → markTicketPaid() [no-op if already paid by webhook]
  → sendTicketConfirmationEmail() [dynamic import of emailjs]
  → Redirect to /tickets/{reference}
```

### Merch Flow
```
User → POST /api/paystack/merch/initialize
  → Fetches product prices from Firestore (tamper prevention)
  → Recomputes total server-side
  → Calls Paystack /transaction/initialize
  → createMerchOrder() → Firestore merch_orders/{reference}
  → Returns { authorization_url }
Paystack → GET /shop/verify?reference={ref}
  → GET /api/paystack/merch/verify
  → Firestore transaction: upsert order as "paid" (idempotent)
  → Promise.allSettled: increment soldCount on each product
  → Returns order data to page
```

### Idempotency
`markTicketPaid` and the merch verify transaction both read `status` first. If already `"paid"` or `"confirmed"`, they return without side effects. This handles the race between the Paystack webhook and the redirect-based verify route.

### Webhook Security
```typescript
const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY)
  .update(JSON.stringify(body))
  .digest("hex");
if (hash !== req.headers["x-paystack-signature"]) {
  return 401; // Reject forged webhooks
}
```

---

## 9. Email System — EmailJS

EmailJS sends all emails **from the browser** — no server email infrastructure. This means:
- No backend email server to maintain
- Email env vars are `NEXT_PUBLIC_` (visible in JS bundle — EmailJS public key is designed to be exposed)
- Rate limiting is managed by EmailJS dashboard (not our code)

### Two Templates
| Template | Variable | Purpose |
|---|---|---|
| T_NOTIFY (Template 1) | `NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE` | Goes to admin inbox (hardcoded in EmailJS) |
| T_CONFIRM (Template 2) | `NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE` | Goes to `{{to_email}}` (user) |

### Email Functions
```typescript
// Admin notifications (→ admin inbox)
notifyAdminContact(data)          // Contact form submitted
notifyAdminVendorApplied(data)    // Vendor application submitted
notifyAdminTestimonial(data)      // User testimonial submitted

// User confirmations (→ user's email)
sendContactConfirmationEmail(data)  // After contact form
sendTicketConfirmationEmail(data)   // After ticket payment verified
sendVendorAppliedEmail(data)        // After vendor application
sendVendorStatusEmail(data)         // On approve/decline/revoke
sendNewsletterWelcomeEmail(email)   // After newsletter subscribe

// Composite (fires both in parallel)
sendContactEmail(data)  // notifyAdmin + sendContactConfirmation via Promise.allSettled
```

### Dev Warning
If any env var is missing in development, `lib/emailjs.ts` logs a warning listing the missing variables. This fires once at module load, not on every send.

---

## 10. State Management Patterns

This app uses **React local state only** — no Redux, Zustand, or Context. Each page manages its own state. Shared data is fetched per-page with Firestore subscriptions.

### Pattern 1: Cache + Subscribe (used on 6+ pages)
```typescript
// Serve from cache instantly → no loading flash
const resolvedRef = useRef(false);

useEffect(() => {
  resolvedRef.current = false;
  const cached = getCache<DanEvent[]>("dan_active_events");
  if (cached) {
    setEvents(cached);
    setLoading(false);
    resolvedRef.current = true;
  }

  return subscribeActiveEvents((fresh) => {
    setEvents(fresh);
    setCache("dan_active_events", fresh);
    if (!resolvedRef.current) {
      setLoading(false);
      resolvedRef.current = true;
    }
  });
}, []);
```

**Why `resolvedRef` instead of `let resolved`?**
`let resolved` is closure-local and works in production. But in React Strict Mode (development), effects fire twice. The ref persists across the two invocations so the flag is reliable in all environments.

### Pattern 2: Promise.allSettled for Independent Operations
```typescript
// One failure doesn't block the other
const [evRes, itemRes] = await Promise.allSettled([
  getAllEvents(),
  getAllGalleryItems(),
]);
if (evRes.status === "fulfilled") setEvents(evRes.value);
if (itemRes.status === "fulfilled") setItems(itemRes.value);
```

### Pattern 3: Set<string> for Concurrent Updates
Admin pages that update multiple items independently use `Set<string>` instead of `string | null`:
```typescript
const [updating, setUpdating] = useState<Set<string>>(new Set());

const handleUpdate = async (id: string) => {
  setUpdating(prev => new Set(prev).add(id));
  try {
    await updateSomething(id);
  } finally {
    setUpdating(prev => { const next = new Set(prev); next.delete(id); return next; });
  }
};

// In JSX:
disabled={updating.has(item.id)}
```

### Pattern 4: DOM-Direct for High-Frequency Events
The shop's 3D tilt card uses `onMouseMove` to write directly to `element.style.transform`:
```typescript
onMouseMove={(e) => {
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  el.style.transform = `rotateY(${x * 15}deg) rotateX(${-y * 15}deg)`;
}}
```
This avoids re-rendering the product grid on every mouse movement.

---

## 11. Caching Strategy

All caching is **localStorage-based** with a 10-minute TTL.

### Cache Keys
| Key | Data | Invalidated by |
|---|---|---|
| `dan_active_events` | Active event array | `updateEvent`, `deleteEvent` |
| `dan_past_events` | Past event array | `updateEvent`, `deleteEvent` |
| `dan_approved_vendors` | Approved vendor array | `updateVendorStatus` |
| `dan_gallery` | Gallery item array | `createGalleryItem`, `deleteGalleryItem` |
| `dan_products` | Product array | `updateProduct`, `deleteProduct` |
| `dan_contact_last_submit` | Timestamp (rate limiting) | Expires after 60s |

### Cache Functions
```typescript
getCache<T>(key)          // → T | null (null if missing or expired)
setCache<T>(key, data)    // Saves with current timestamp
clearCache(key)           // Force evict (used after writes)
```

All cache functions are **SSR-safe** (no-op when `typeof window === "undefined"`).

---

## 12. Component Architecture

### Shared Public Components (`app/_components/`)
| Component | Description |
|---|---|
| `Navbar` | Fixed top nav. Hides on `/admin/*`. Mobile: full-screen slide-in |
| `Footer` | Three-column: brand, links, newsletter subscribe |
| `VendorModal` | Multi-step vendor application (step 1: info, step 2: details + menu builder) |
| `TestimonialSection` | Testimonial carousel + optional submit form |
| `Carousel` | Generic auto-play carousel (used for testimonials, vendor images) |
| `CardCountdown` | Live days/hours/minutes/seconds countdown. Exports `useCountdown(date)` hook |
| `NeonMarquee` | CSS infinite scrolling ticker. Zero re-renders (defined outside component) |
| `SectionFadeIn` | Scroll-triggered fade-in wrapper (framer-motion, fires once) |
| `CameraScanner` | QR camera scanner (dynamically imported, ssr: false) |
| `loader` | Branded intro animation (home page only) |

### Visual / WebGL Components (`components/`)
| Component | Description |
|---|---|
| `Antigravity` | Three.js particle field (home hero background) |
| `Orb` | OGL WebGL animated orb |
| `DoodleBg` | Doodle background effect |
| `Grainient` | Grainy gradient overlay |

### Key Component Decisions
- **`ImageUpload`** is fully commented out. Image URLs are plain text inputs. Firebase Storage was removed to simplify the stack.
- **`TicketModal`** (inline on `/event`) is ~400 lines — intentionally not extracted as a shared component since it's only used in one place.
- **`CameraScanner`** uses `dynamic(() => import(...), { ssr: false })` so `html5-qrcode` only loads in the browser, not during SSR.

### useScrollLock
When a modal is open:
```typescript
useScrollLock(!!selectedItem);  // locks body scroll
```
Uses a module-level `lockCount` so concurrent modals don't race (only restores scroll when all modals close).

---

## 13. Design System

### Colour Palette
| Colour | Hex | Usage |
|---|---|---|
| Neon Yellow | `#FFFF00` | Primary accent, CTAs, headings |
| Neon Green | `#00FF41` | Success states, nav active, testimonials |
| Neon Red | `#FF3333` | Error states, vendor type badge, alerts |
| Neon Orange | `#FF8C00` | Return/warning states (orders) |
| Black | `#000000` / `#030303` | Background |
| Dark surface | `#060606` / `#0a0a0a` / `#0d0d0d` | Cards, sidebars, modals |
| Gray text | `text-gray-500` / `text-gray-600` / `text-gray-700` | Body text hierarchy |

### Typography
- Font: **Poppins** (Google Fonts, loaded in root layout)
- Headings: `uppercase tracking-widest font-bold`
- Labels/badges: `text-[9px] uppercase tracking-[0.2em] font-bold`
- Body: `text-sm leading-relaxed`

### Glow Effects
All neon UI elements use `text-shadow` and `box-shadow` for the glow:
```css
color: #FFFF00;
text-shadow: 0 0 15px rgba(255,255,0,0.5);
box-shadow: 0 0 20px rgba(255,255,0,0.3);
```

### Layout Pattern
- Max width: `max-w-6xl mx-auto px-6 md:px-16`
- Section spacing: `py-16` to `py-28`
- Cards: `rounded-2xl border` with `rgba(255,255,255,0.06)` border color
- Modals: `fixed inset-0 z-50 flex items-center justify-center`

### Animation Conventions
- **Page sections**: `SectionFadeIn` wrapper (opacity 0→1, y 50→0, 0.9s)
- **Modals**: framer-motion `scale: 0.94 → 1, y: 16 → 0`
- **Hover**: `whileHover={{ scale: 1.03 }}`, `whileTap={{ scale: 0.97 }}`
- **Backdrop**: `bg-black/80 backdrop-blur-sm`

---

## 14. Admin Panel Architecture

### Navigation Structure
```
/admin/*  → AdminLayout (sidebar + top/bottom nav)
  ├── Events group (tab bar: Events / Tickets / Vendors / Confirm)
  ├── Gallery group (no tab bar — single page)
  ├── Store group (tab bar: Products / Orders)
  └── Dashboard (exact match only)
```

**Tab bar lives in the layout** (not in page components). This means:
- Switching tabs within a group = no animation (same group key)
- Switching groups = framer-motion fade/slide (new group key)

### Auth Guard
```
Request to /admin/*
  → middleware.ts: checks dan_admin cookie (Edge, fastest)
  → AdminLayout: onAuthStateChanged (client-side, belt-and-suspenders)
  → if checking: yellow spinner
  → if !authed (redirect pending): red spinner
  → if authed: render admin UI
```

---

## 15. API Routes

### `POST /api/admin/session`
Login. Verifies Firebase ID token via Google Identity Toolkit REST API. Sets `dan_admin=1` httpOnly cookie if email is in `ADMIN_EMAILS`.

### `DELETE /api/admin/session`
Logout. Clears the `dan_admin` cookie.

### `POST /api/paystack/initialize`
Ticket payment init. Validates input, calls Paystack, creates pending ticket in Firestore.

### `GET /api/paystack/verify`
Ticket payment verify. Verifies with Paystack, marks ticket paid (idempotent Firestore transaction).

### `POST /api/paystack/webhook`
Paystack event webhook. Verifies HMAC-SHA512 signature, processes `charge.success` events.

### `POST /api/paystack/merch/initialize`
Merch payment init. Fetches product prices from Firestore (tamper prevention), calls Paystack, creates pending order.

### `GET /api/paystack/merch/verify`
Merch payment verify. Verifies with Paystack, upserts order as paid (idempotent), increments product soldCounts.

### `POST /api/subscribe`
Newsletter subscribe. Rate-limited (10/hour per IP), writes to `subscribers` collection.

---

## 16. Performance Patterns

### React Compiler
`reactCompiler: true` in `next.config.ts` — automatic memoisation. No manual `useMemo`/`useCallback` needed unless you have a measured reason.

### Dynamic Imports
```typescript
// Camera scanner — only loads when admin opens scanner
const CameraScanner = dynamic(() => import("@/app/_components/CameraScanner"), { ssr: false });

// EmailJS — only loads after payment verified (heavy library)
const { sendTicketConfirmationEmail } = await import("@/lib/emailjs");
```

### Image Handling
- Next.js `<Image>` with `priority` on above-the-fold images
- Image domains configured in `next.config.ts`
- All product/event images are external URLs (no Firebase Storage)

### Zero-Re-render Marquee
`NeonMarquee` has all data defined at module level (outside the component). It never re-renders after mount — the animation is pure CSS.

### DOM-Direct Tilt
Shop product cards write `style.transform` directly on mousemove — no React state involved.

---

## 17. Known Limitations & Future Work

### Current Limitations
| Issue | Impact | Notes |
|---|---|---|
| No image upload UI | Vendors/admins must paste image URLs | `ImageUpload` component exists but is commented out |
| No pagination | All vendors/gallery items load at once | Will degrade as data grows |
| No cart persistence | Cart is in-memory (React state) | Lost on refresh |
| Client-side EmailJS | Public key visible in bundle | EmailJS designed for this; limit rate in dashboard |
| Single admin role | No per-admin permissions | All admins have full access |
| RBAC not implemented | No Firestore role documents | Next step: Firebase custom claims |
| In-process rate limiting | Rate limiter resets per Lambda instance | Effective enough for current traffic |

### Recommended Next Steps
1. **Pagination** — Add Firestore cursor-based pagination to vendors, gallery, orders
2. **Image upload** — Uncomment and integrate `ImageUpload.tsx` with Firebase Storage
3. **Cart persistence** — Move cart state to `localStorage`
4. **RBAC** — Add Firebase custom claims for granular admin permissions
5. **Push notifications** — Firebase Cloud Messaging for order updates
6. **Analytics** — Firebase Analytics already configured (measurement ID in env)
7. **Server-sent emails** — Migrate from EmailJS to Resend/Postmark API route for reliability

---

## 18. Local Development Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd dineatnight

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env.local
# Fill in all values in .env.local

# 4. Start dev server
npm run dev
# → http://localhost:3000

# 5. Build for production
npm run build
npm start
```

### Firestore Emulator (optional)
If you want to develop without touching the production database, configure the Firebase Emulator Suite and update `lib/firebase.ts` to connect to `localhost:8080`.

### Admin Access (local)
1. Create a Firebase Auth user in the Firebase Console
2. Add their email to `ADMIN_EMAILS` in `.env.local`
3. Navigate to `http://localhost:3000/admin/login`

### Paystack Testing
Use Paystack test keys (`pk_test_...` / `sk_test_...`) in `.env.local`. Test card: `4084 0840 8408 4081`, any future expiry, any CVV.

---

*Last updated: March 2026 | Built by Those Who Dine*
