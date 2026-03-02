# Dine At Night

Lagos's premier nighttime food market platform — an outdoor experience combining the best local food vendors, live music, and neon-lit vibes.

**Live site:** https://dine-at-night.vercel.app
**Admin panel:** https://dine-at-night.vercel.app/admin

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI / Animation | Framer Motion, Lucide React, Shadcn/ui |
| Backend / DB | Firebase (Firestore + Auth) |
| Payments | Paystack |
| Email | EmailJS |
| QR Codes | `qrcode` (generate) + `html5-qrcode` (scan) |
| Excel Export | XLSX |
| Deployment | Vercel |

---

## Project Structure

```
app/
├── (home)/home/        # Landing page — hero, events, vendors, gallery, Instagram feed, newsletter
├── aboutUs/            # About page
├── event/              # Event details
├── gallery/            # Photo gallery with lightbox
├── shop/               # Merchandise shop
├── cart/               # Shopping cart + Paystack checkout
├── tickets/            # Ticket management with QR codes
├── vendors/            # Vendor listing + application form
├── contact/            # Contact page
├── admin/              # Admin dashboard (protected)
│   ├── events/         # Manage events
│   ├── vendors/        # Review / approve / decline vendor applications
│   ├── gallery/        # Upload and manage gallery photos
│   ├── shop/           # Manage shop products
│   ├── orders/         # View orders
│   ├── tickets/        # View and export tickets (XLSX), QR scanner
│   ├── testimonials/   # Manage testimonials
│   └── confirm/        # On-site ticket QR scanner
├── _components/        # Shared components (Navbar, Footer, VendorModal, etc.)
└── api/                # API routes
lib/
├── firebase.ts         # Firebase app initialisation
├── firestore.ts        # All Firestore read / write helpers
├── emailjs.ts          # EmailJS helpers
├── cache.ts            # In-memory cache utility
├── rateLimit.ts        # Client-side rate limiter
└── useScrollLock.ts    # Body scroll-lock hook
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file at the root and add the following:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000/
NEXT_PUBLIC_ADMIN_EMAILS=example@example.com

# EmailJS
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE=
NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE=
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Admin Panel

The admin panel is accessible at `/admin/login`.

| Field | Value |
|---|---|
| Email | admin@dineatnight.com |
| Password | admin1 |

Admin access is controlled by the `NEXT_PUBLIC_ADMIN_EMAILS` environment variable. Only Firebase-authenticated users whose email is in that list can access admin routes.

### Admin Features

- **Dashboard** — Overview stats
- **Events** — Create, edit, and delete events; toggle past/upcoming from the card
- **Vendors** — Review applications, approve or decline with reasons; send status emails
- **Gallery** — Upload and manage event photos
- **Shop** — Add / edit / remove merchandise with live stock tracking
- **Orders** — View merch orders; manage delivery pipeline (Pending → Dispatched → Delivered / Returned); auto-restock on return; undo status changes
- **Tickets** — View all tickets, export to Excel, scan QR codes for on-site check-in
- **Testimonials** — Approve or remove customer testimonials

---

## Key Features

- **Vendor Applications** — Multi-step form with menu builder, image upload, and event selection
- **Ticket System** — QR code generation per ticket; on-site scanning via camera
- **Shop + Cart** — Live inventory (real-time Firestore), server-side stock validation, cart persists in localStorage, auto-removes sold-out items, Paystack checkout, delivery status tracking with customer email notifications
- **Gallery Lightbox** — Full-screen image viewer with keyboard navigation
- **Newsletter** — Email subscription with EmailJS welcome emails
- **Scroll Progress Bar** — Brand-coloured (#FF3333 → #FFFF00 → #00FF41) progress indicator on all pages and modals
- **SEO** — Open Graph, Twitter cards, sitemap, robots meta

---

## Deployment

The project is deployed on [Vercel](https://vercel.com). Push to `main` triggers an automatic production build.

Make sure all environment variables listed above are added in the Vercel project settings under **Settings → Environment Variables**.
