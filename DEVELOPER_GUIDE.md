# Dine At Night — Developer Guide

The single technical reference for this codebase. For day-to-day admin tasks see
[ADMIN_GUIDE.md](ADMIN_GUIDE.md); for the public site see [USER_GUIDE.md](USER_GUIDE.md).

*Last updated: October 2026*

## Contents

1. [Overview](#1-overview)
2. [Local setup](#2-local-setup)
3. [Environment variables](#3-environment-variables)
4. [Architecture and trust model](#4-architecture-and-trust-model)
5. [Directory structure](#5-directory-structure)
6. [Admin access](#6-admin-access)
7. [Payments (Paystack)](#7-payments-paystack)
8. [Vendors](#8-vendors)
9. [Email (Resend)](#9-email-resend)
10. [Check-in integration](#10-check-in-integration)
11. [API routes](#11-api-routes)
12. [Firestore collections](#12-firestore-collections)
13. [Security rules](#13-security-rules)
14. [Caching and performance](#14-caching-and-performance)
15. [Security headers](#15-security-headers)
16. [Deployment](#16-deployment)
17. [Gotchas](#17-gotchas)

---

## 1. Overview

Website and admin panel for Dine At Night, a night food market in Lagos: events and
ticket sales, a vendor directory and applications, a merch shop, gallery,
testimonials and newsletter.

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React Compiler), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4, Framer Motion, lucide-react |
| Database / files / login | Firebase: Firestore, Storage, Auth (client SDK in the browser, **Admin SDK on the server**) |
| Payments | Paystack (hosted checkout + webhook) |
| Email | Resend |
| Hosting | Vercel (Node.js version: 22.x) |

---

## 2. Local setup

Requirements: **Node.js 22+** and npm.

```bash
npm install
# create .env.local with the variables in section 3
npm run dev                  # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check only |

`npm run build` needs at least `RESEND_API_KEY` set (any non-empty value works
locally) because `lib/resend.ts` constructs its client at import time.

---

## 3. Environment variables

Set in `.env.local` locally and in **Vercel → Settings → Environment Variables**.
Changes in Vercel only apply after a **redeploy**.

### Public (bundled into the browser — not secret)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` … `_APP_ID`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_MEASUREMENT_ID` | Firebase web config (project `dine-at-night`) |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL, e.g. `https://www.dineatnight.com` (used for Paystack callbacks, email links, sitemap) |

### Server-only (never prefix with `NEXT_PUBLIC_`)

| Variable | Required | Purpose |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | **Yes** | Service-account JSON (Firebase → Project settings → Service accounts). All server-side database access. Without it checkout, subscribe, vendors list and admin login fail — on purpose, there is no insecure fallback. |
| `ADMIN_EMAILS` | **Yes** | **The only admin list.** Comma-separated; each entry is `email` or `Full Name <email>`. See [section 6](#6-admin-access). |
| `SESSION_SECRET` | **Yes** | 32+ random characters. Signs the admin session cookie and unsubscribe links. |
| `PAYSTACK_SECRET_KEY` | **Yes** | Paystack live secret key. Also verifies webhook signatures. |
| `RESEND_API_KEY` | **Yes** | Resend API key. |
| `RESEND_FROM_EMAIL` | No | Sender, default `hello@dineatnight.com` (domain must be verified in Resend). |
| `RESEND_ADMIN_EMAIL` | No | Inbox for admin notifications, default `hello@dineatnight.com`. |
| `CHECKIN_WEBHOOK_URL`, `CHECKIN_WEBHOOK_SECRET` | No | Enable the check-in push feed ([section 10](#10-check-in-integration)). |
| `CHECKIN_API_KEY` | No | Enables the check-in pull API ([section 10](#10-check-in-integration)). |

---

## 4. Architecture and trust model

```
Browser ──(client SDK, public reads + admin writes)──► Firestore / Storage ◄── security rules
   │                                                         ▲
   └──► Next.js API routes (app/api/*) ──(Admin SDK)─────────┘   bypasses rules
            │
            ├──► Paystack  (initialize / verify; webhook comes back in)
            └──► Resend    (all email)
```

The rules that matter:

1. **Every server-side database write uses the Firebase Admin SDK** (`lib/firebase-admin.ts` → `adminDb()`).
   Never import `lib/firebase.ts` (the client SDK) into an API route — on the
   server it has no login, so it would need world-writable rules to work.
2. **Nothing the browser sends is trusted for money.** Ticket and merch prices,
   names and stock are read from Firestore on the server (`lib/payments.ts`), and
   paid-marking checks the amount Paystack actually charged.
3. **Security rules are the boundary for the browser.** The public can only read
   public content, submit a vendor application / testimonial, and fetch one
   ticket by its reference. Everything else requires the `admin` claim.
4. **`lib/firestore.ts` is client-side** (public reads and admin-panel writes).
   **`lib/payments.ts`, `lib/checkin.ts`, `lib/rateLimit.ts` and `lib/firebase-admin.ts` are server-only.**

---

## 5. Directory structure

```
app/
  (home)/home/        Home page (rendered at /)
  event/ vendors/ shop/ gallery/ aboutUs/ contact/ careers/ cart/
  tickets/[reference] Public ticket page (QR code)
  tickets/verify      Paystack callback for tickets
  shop/verify         Paystack callback for merch
  unsubscribe/        Unsubscribe result page
  admin/              Admin panel (guarded by proxy.ts)
  api/                API routes (section 11)
  _components/        Shared UI (VendorModal, TicketModal, ImageUpload, MultiImageUpload, …)
  layout.tsx          Root layout, SEO metadata, JSON-LD
  globals.css
lib/
  firebase.ts         Client SDK init (browser)
  firebase-admin.ts   Admin SDK: adminDb(), ID-token verify, admin claim sync   [server]
  firestore.ts        Types + client-side data helpers
  payments.ts         Pricing, pending tickets/orders, paid-marking            [server]
  checkin.ts          Check-in push/pull helpers                                [server]
  session.ts          Admin session cookie + ADMIN_EMAILS parsing
  rateLimit.ts        Firestore rate limiter                                    [server]
  resend.ts           All email templates + sending                             [server]
  adminLog.ts         Admin activity log + admin display names
  cache.ts            localStorage display cache
  constants.ts        Rate limits, TTLs, quantity bounds
proxy.ts              Guards /admin/* pages (Next 16's middleware)
firestore.rules       Firestore security rules   (committed — deploy with Firebase CLI)
storage.rules         Storage security rules     (committed)
firestore.indexes.json
docs/CHECKIN_INTEGRATION.md   Spec for the client's check-in system
vendor/xlsx-0.20.3.tgz        SheetJS (installed from this file; npm no longer hosts current versions)
assets/               Static images imported by pages (keep them under ~300 KB each)
```

---

## 6. Admin access

**`ADMIN_EMAILS` in Vercel is the single source of truth.** There is no admin list
anywhere in the code or rules.

```
ADMIN_EMAILS=Admin <admin@dineatnight.com>, Tami Bolu <tami@dineatnight.com>, ajibola@dineatnight.com
```

How it works:

1. Admin signs in with Firebase Auth (email + password) on `/admin/login`.
2. The browser sends the ID token to `POST /api/admin/session`, which:
   - verifies the token with the Admin SDK and checks the email is in `ADMIN_EMAILS`;
   - sets the **`admin` custom claim** on the Firebase user (and the display name, if given);
   - sets the `dan_admin` httpOnly cookie, `email:expiry:HMAC-SHA256`, 24 h.
3. The browser refreshes its ID token so Firestore/Storage rules see `admin: true`.

Three layers check this:

| Layer | Check |
|---|---|
| `proxy.ts` | `/admin/*` pages need a valid, unexpired cookie for an email still in `ADMIN_EMAILS` |
| Admin API routes | Same cookie check (`getAdminEmail()` in `lib/session.ts`) |
| `firestore.rules`, `storage.rules` | `request.auth.token.admin == true` |

**Adding an admin:** create their user in Firebase Console → Authentication, add
them to `ADMIN_EMAILS`, redeploy. The claim is set on their first login.

**Removing an admin:** remove them from `ADMIN_EMAILS` and redeploy — the panel
and admin APIs reject them immediately. Their `admin` claim is revoked the next
time they sign in; to cut database access immediately, also **disable their
account** in Firebase Console → Authentication.

Public sign-up must be **off** (Firebase → Authentication → Settings → User actions).

---

## 7. Payments (Paystack)

### Tickets

```
TicketModal ─► POST /api/paystack/initialize
                 quoteTicket(): event must be active; price from the event/tier; capacity checked
                 Paystack /transaction/initialize (amount computed server-side)
                 createPendingTicket()  → tickets/{reference}  status "pending"
             ─► Paystack hosted checkout
Paystack ─► POST /api/paystack/webhook   (HMAC-SHA512 signed)  ┐
Browser  ─► /tickets/verify → GET /api/paystack/verify         ┘ both call markTicketPaid()
```

`markTicketPaid(reference, paidAmountKobo)` is an idempotent transaction: it only
flips `pending → paid` if the charged amount ≥ the stored amount, increments
`events.soldTickets` by the stored quantity, and returns `true` only for the call
that did the flip (which then sends the confirmation email once and forwards the
ticket to the check-in system).

The QR code on `/tickets/[reference]` encodes
`{APP_URL}/admin/confirm?ref={reference}`. Gate check-in (`confirmTicket`) is a
transaction (`paid → confirmed`), so a ticket can't be admitted twice.

### Merch

Same shape: `POST /api/paystack/merch/initialize` prices the cart from `products`
(`priceCart()` — whole quantities 1–50, stock, active flag) and stores the order
with server-side names/prices; the webhook and `GET /api/paystack/merch/verify`
call `markMerchOrderPaid()` (amount-checked, increments `soldCount` once).

**The webhook is the authoritative channel.** Configure it in Paystack →
Settings → API Keys & Webhooks → Live Webhook URL:
`https://www.dineatnight.com/api/paystack/webhook`. Leave the Callback URL empty.

---

## 8. Vendors

- **Applications** (`VendorModal`) write directly to Firestore with `status: "pending"`;
  `firestore.rules` restricts the allowed fields.
- **Vendor documents are admin-only.** The public site loads approved vendors from
  `GET /api/vendors`, which returns a whitelist of public fields: business
  contact (email/phone/Instagram), description, categories, events, pictures,
  menu. Owner name, decline reasons and review history never leave the server.
- **Pictures:**
  | Field | Set by | Shown as |
  |---|---|---|
  | `imageUrl` / `imageUrls` | Application "Brand Logo" upload; admin "Main Picture" | Card image / slideshow |
  | `logoUrl` | Admin "Brand Logo"; the application's logo upload | Small logo |
  | `menuImages` (≤6) | Menu step / admin | Popup "Menu", shown as designed |
  | `productImages` (≤6) | Application step 1 / admin | Added to the card slideshow |

  `vendorDisplayImages()` picks card images and falls back to the logo, then a
  menu picture, so no card renders empty. Uploads go to Storage under
  `vendors/{photos,logos,menus,products}/` with random names (create-only for the public).
- **Ordering:** `pinned` vendors first, then newest `submittedAt`. Admins pin from
  the vendor list. The home page shows pinned vendors plus random others (3 total).
- Deleting an event or product **archives** it (`deleted_events` /
  `deleted_products`); tickets and orders are never deleted with it.

---

## 9. Email (Resend)

All email is sent server-side from `lib/resend.ts`. Every user-supplied value is
HTML-escaped (`escapeFields()`) before it goes into a template — keep it that way
when adding templates.

| Trigger | Email |
|---|---|
| Contact form | Admin notification + confirmation to sender |
| Vendor application | Confirmation to vendor + admin notification |
| Vendor approve / decline / revoke (admin) | Status email to vendor |
| Ticket paid | Ticket confirmation with link to the QR page (sent once) |
| Merch delivery status change (admin) | Order status email (`/api/emails/order-status`) |
| Newsletter subscribe | Welcome email with one-click unsubscribe |
| Admin newsletter | Batched (50/request), per-recipient unsubscribe link |

Unsubscribe links carry `HMAC(email)`; `/api/unsubscribe` supports GET (link
click) and POST (RFC 8058 one-click, required by Gmail/Yahoo bulk-sender rules).

---

## 10. Check-in integration

For an external check-in system. Both are off until their env vars are set.

- **Push:** each newly paid ticket is POSTed to `CHECKIN_WEBHOOK_URL`, signed with
  `X-DAN-Signature: sha256=HMAC(body, CHECKIN_WEBHOOK_SECRET)`. Runs after the
  response via `after()`; one retry; outcome stored on the ticket
  (`checkinPushedAt` / `checkinPushError`).
- **Pull:** `GET /api/checkin/tickets?eventId=&cursor=&limit=` with
  `Authorization: Bearer CHECKIN_API_KEY`.

Full spec for the client's developers: [docs/CHECKIN_INTEGRATION.md](docs/CHECKIN_INTEGRATION.md).

---

## 11. API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/admin/session` | POST / DELETE | Firebase ID token | Admin login (claim + cookie) / logout |
| `/api/admin/newsletter` | POST | Admin cookie | Send newsletter |
| `/api/emails/vendor-status` | POST | Admin cookie | Vendor status email |
| `/api/emails/order-status` | POST | Admin cookie | Merch delivery email (recipient read from the order) |
| `/api/emails/vendor-applied` | POST | Rate-limited | Application emails |
| `/api/emails/testimonial-notify` | POST | Rate-limited | Notify admin of a testimonial |
| `/api/contact` | POST | Rate-limited | Contact form emails |
| `/api/subscribe` | POST | Rate-limited | Newsletter signup |
| `/api/unsubscribe` | GET / POST | HMAC token | Unsubscribe |
| `/api/vendors` | GET | Public (edge-cached 60 s) | Approved vendors, public fields only |
| `/api/paystack/initialize` | POST | Rate-limited | Start ticket checkout |
| `/api/paystack/verify` | GET | Paystack reference | Confirm ticket payment |
| `/api/paystack/merch/initialize` | POST | Rate-limited | Start merch checkout |
| `/api/paystack/merch/verify` | GET | Paystack reference | Confirm merch payment |
| `/api/paystack/webhook` | POST | HMAC-SHA512 signature | Paystack events |
| `/api/checkin/tickets` | GET | Bearer `CHECKIN_API_KEY` | Check-in pull API |

Rate limits live in `lib/constants.ts` and use the `rate_limits` collection
(Admin SDK, fail-open).

---

## 12. Firestore collections

| Collection | Doc ID | Written by | Read by |
|---|---|---|---|
| `events` | auto | Admin (client); `soldTickets` by server | Public |
| `tickets` | Paystack reference | Server; admin (check-in) | Single doc by reference: public. List: admin |
| `merch_orders` | Paystack reference | Server; admin (delivery status) | Admin |
| `products` | auto | Admin; `soldCount` by server | Public |
| `vendors` | auto | Public create (pending); admin | Admin (public via `/api/vendors`) |
| `gallery` | auto | Admin | Public |
| `testimonials` | auto | Public create (pending); admin | Public |
| `subscribers` | email | Server | Admin |
| `newsletters`, `suppressed_emails`, `admin_logs`, `deleted_events`, `deleted_products` | — | Admin | Admin |
| `rate_limits` | key:window | Server | Server |

Amounts: `tickets.amount` is **kobo**; `products.price`, `merch_orders.total` and
event ticket prices are **naira**.

---

## 13. Security rules

`firestore.rules` and `storage.rules` are committed. Deploy with:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,storage --project dine-at-night
```

(`firebase.json` is gitignored; it only needs to point at the two rules files and
`firestore.indexes.json`.)

**Deploy order:** ship the code first, then the rules. Rules that expect new
fields or the `admin` claim will reject the old code's requests.

Remember that **rules are not filters**: a client query must be constrained so
that every possible result is readable, or the whole query is denied.

---

## 14. Caching and performance

| Layer | Where | What |
|---|---|---|
| Server rendering (ISR) | `/home`, `/event`, `/vendors`, `/gallery` | `page.tsx` reads data on the server (`lib/publicData.ts`, Admin SDK) with `revalidate = 60`; Vercel caches the HTML. The `*Client.tsx` component starts from that data; `/home` and `/event` keep live event subscriptions for ticket counts. If a server read fails, that section falls back to loading in the browser. Random picks use `seededShuffle()` with a seed chosen on the server (`lib/random.ts`) so the server HTML matches hydration. |
| Browser display cache | `lib/cache.ts` | localStorage, 10 min TTL. Bump `CACHE_VERSION` in `lib/constants.ts` when a cached shape changes. Never use cached data for prices or auth. |
| Edge cache | `/api/vendors` | `s-maxage=60, stale-while-revalidate=300` |
| Images | `next/image` | AVIF/WebP per device; remote hosts allowed in `next.config.ts` |

The shop is still client-rendered (no products yet); it can follow the same
pattern when it's used. When converting, keep render output free
of `Date.now()` / `Math.random()` / `window` (do those in effects) to avoid
hydration mismatches — see `useCountdown` in `CardCountdown.tsx`.

Keep `assets/` images small (resize to ≤1600 px wide before committing). Large
video goes on Cloudinary, not in git.

---

## 15. Security headers

Set in `next.config.ts` for every route: `frame-ancestors 'none'` +
`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
(camera allowed for the gate scanner), HSTS. The full Content-Security-Policy is
shipped as **Report-Only**; once the live console shows no violations, rename the
header to `Content-Security-Policy`. Add any new external script/image/API host
to the CSP when you introduce it.

---

## 16. Deployment

Vercel deploys `master` automatically.

Checklist for a new environment or after big changes:

- [ ] All server-only env vars set (section 3); redeploy after changes
- [ ] Vercel → Settings → Node.js Version: **22.x**
- [ ] Rules deployed (section 13) — after the code
- [ ] Paystack Live Webhook URL set (section 7)
- [ ] Firebase Auth public sign-up disabled
- [ ] Resend sending domain verified
- [ ] `npm run build` passes locally

---

## 17. Gotchas

- **Firestore rejects `undefined` field values.** Omit the key instead
  (`...(x ? { x } : {})`), or use `deleteField()` to clear it on update.
- **`updateDoc` only changes the keys you pass.** To clear a field, send
  `deleteField()` — see `updateEvent()` for the external ticket link.
- **Admin claim changes need a token refresh** (`user.getIdToken(true)`) before
  Firestore sees them. The admin layout does this automatically.
- **`NEXT_PUBLIC_*` values are baked in at build time** — redeploy after changing them.
- **Timestamps:** client SDK `Timestamp` and Admin SDK `Timestamp` are different
  classes. Server routes return ISO strings, never raw timestamps.
- **SheetJS** is installed from `vendor/xlsx-0.20.3.tgz`; npm's `xlsx` package is
  abandoned. To upgrade, download the new tarball from cdn.sheetjs.com into `vendor/`.
- **CRLF:** the repo uses Windows line endings in most files; keep your editor's
  setting so diffs stay small.
