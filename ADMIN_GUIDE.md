# Dine At Night — Admin Guide

> Complete guide for managing the Dine At Night platform via the admin panel.
> **Admin URL:** `dineatnight.com/admin`

---

## Table of Contents

1. [Accessing the Admin Panel](#1-accessing-the-admin-panel)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Events](#3-managing-events)
4. [Managing Tickets](#4-managing-tickets)
5. [Gate Scanning (Ticket Confirmation)](#5-gate-scanning-ticket-confirmation)
6. [Managing Vendors](#6-managing-vendors)
7. [Managing the Gallery](#7-managing-the-gallery)
8. [Managing Testimonials](#8-managing-testimonials)
9. [Managing the Shop (Products)](#9-managing-the-shop-products)
10. [Managing Orders](#10-managing-orders)
11. [Managing the Email List](#11-managing-the-email-list)
12. [Admin Maintenance](#12-admin-maintenance)
13. [What to Avoid](#13-what-to-avoid)
14. [Security Practices](#14-security-practices)
15. [Adding / Removing Admins](#15-adding--removing-admins)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Accessing the Admin Panel

### Login
1. Go to `dineatnight.com/admin/login`
2. Enter your admin **email** and **password**
3. Click **Sign In**
4. You'll be redirected to the dashboard

> Your account must be registered in Firebase Auth **and** added to the `ADMIN_EMAILS` environment variable in Vercel. Both conditions must be true.

### Session Duration
Your login session lasts **24 hours**. After that, you'll be redirected to the login page automatically.

### Sign Out
Click **Sign Out** in the sidebar (desktop) or top header (mobile). Always sign out on shared devices.

### Navigation
**Desktop:** Left sidebar with 5 main sections — Dashboard, Events, Gallery, Store, Emails.

**Mobile:** Bottom tab bar with the same sections + top header with sign out.

Within **Events** and **Store**, a tab bar appears at the top of the content area:
- Events section: **Events / Tickets / Vendors / Confirm**
- Store section: **Products / Orders**

---

## 2. Dashboard Overview

The dashboard (`/admin`) shows a real-time snapshot of the platform:

### Stat Cards
| Card | What It Shows |
|---|---|
| Active Events | Number of events currently published (status = "active") |
| Tickets Sold | Total paid + confirmed tickets across all events |
| Confirmed (Scanned) | Tickets that have been gate-scanned |
| Ticket Revenue | Total Naira collected from ticket sales |
| Merch Orders | Total paid merch orders |
| Merch Revenue | Total Naira collected from the shop |

### Tables
- **Recent Events** — last 6 events with ticket progress bars (sold / total)
- **Recent Merch Orders** — last 5 orders with delivery status badges
- **Recent Tickets** — last 8 purchased tickets with status

All stats load on page arrival. Revenue figures exclude pending (incomplete) payments.

---

## 3. Managing Events

**Navigate to:** Events → Events tab

### Creating an Event

1. Click **+ Add Event** (top right)
2. Fill in the form:

| Field | Notes |
|---|---|
| **Title** | Event name (e.g. "Dine At Night Vol. 3") |
| **Edition** | Short edition tag (e.g. "Vol. 3") |
| **Date & Time** | Event date — use the datetime picker |
| **Venue** | Full venue address or name |
| **Description** | Shown on the public event card |
| **Status** | Draft (hidden) / Active (public) / Ended |
| **Image URL** | A wide banner image URL. Test the link works before saving |
| **Highlights** | One highlight per line (e.g. "Live DJ Set", "50+ Food Vendors"). These appear as tags |
| **Base Ticket Price** | Legacy field — leave at 0 if using ticket types |
| **Ticket Types** | Add VIP/VVIP/General tiers with name, price (₦), and optional limit |
| **Total Tickets** | Maximum capacity across all ticket types |
| **Sponsors** | Add each sponsor's name and logo URL |
| **Mark as Past** | Tick this when the event has finished — moves it to the Past Events section |

3. Click **Save Event**

### Editing an Event

Click the **pencil/edit** button on any event card. All fields are editable. Changes go live immediately.

> **Important:** Changing ticket prices after sales have started will not affect already-purchased tickets. New purchases will use the new price.

### Publishing / Unpublishing

Change the **Status** field:
- `draft` — hidden from public, useful for setup
- `active` — visible on the public Events page with a buy button
- `ended` — event is over; shown in past events without a buy button

### Marking an Event as Past

Tick **"Mark as Past"** in the edit form when the event date has passed. This:
- Moves it from the active listing to the "Past Events" section
- Removes the countdown timer and buy button
- Keeps it in the gallery and testimonial dropdowns

### Deleting an Event

Click the **trash icon** → confirm in the dialog. This is permanent. Tickets linked to this event are **not automatically deleted** — they remain in Firestore. Only delete events with zero ticket sales.

### Ticket Types (Multi-Tier)

Add multiple ticket types to a single event:
- Click **"+ Add Ticket Type"**
- Set: Name (e.g. "VIP"), Price (₦), optional Limit
- The "Limit" field caps how many of that specific tier can be sold. Leave blank for no per-tier cap.
- The **Total Tickets** field is the overall venue capacity

### Sold Tickets Count

The admin panel shows actual sold tickets from the `tickets` Firestore collection (cross-referenced with real payment data). This is more accurate than the `soldTickets` field on the event document, which is a denormalised counter.

---

## 4. Managing Tickets

**Navigate to:** Events → Tickets tab

### Viewing Tickets for an Event

1. Select an event from the **event dropdown** at the top
2. Tickets for that event appear below in two tabs:
   - **Unscanned** — paid tickets that haven't been scanned at the gate yet
   - **Scanned** — confirmed tickets (gate-scanned)

### What You See Per Ticket
- Buyer name + email
- Ticket type and quantity
- Amount paid (in Naira)
- Payment reference
- Purchase timestamp

### Statistics
Above the ticket list:
- **Sold** — total paid+confirmed tickets
- **Scanned** — confirmed tickets
- **Revenue** — total collection for this event

### Export
You can export ticket data to Excel using the export button (📊) for offline use or printing.

> Tickets cannot be manually deleted from this view. Deleting a ticket requires direct Firestore access.

---

## 5. Gate Scanning (Ticket Confirmation)

**Navigate to:** Events → Confirm tab

This is the gate-scanning interface used on event day to verify and admit ticket holders.

### Two Input Methods

**Manual Entry:**
1. Ask the attendee for their **reference code** (on their e-ticket page or email)
2. Type it into the search field
3. Click **Confirm**

**QR Camera Scan:**
1. Click **"Open Camera Scanner"**
2. Allow camera access when prompted
3. Point the camera at the attendee's **QR code** on their phone
4. The system reads the code automatically and confirms the ticket

### Result States

| Result | Colour | Meaning |
|---|---|---|
| ✓ Confirmed | Green | Valid ticket, now marked as scanned. Let them in |
| Already Scanned | Yellow | This ticket was already used. Do not re-admit unless you're certain |
| Payment Pending | Orange | Ticket exists but payment was not completed. Do not admit |
| Not Found | Red | Reference doesn't exist in the system. Do not admit |

### On Event Day — Best Practices

- Open this page on a **tablet or phone** with a reliable internet connection
- Have at least one staff member on manual lookup for when QR scans fail
- For VIP/VVIP tickets, cross-check the ticket type visible on-screen
- If "Already Scanned" appears and the attendee insists they haven't been admitted, check with the team — someone may have scanned it twice

### Pre-populating via URL

The QR code on each e-ticket encodes the full confirm URL: `dineatnight.com/admin/confirm?ref={reference}`. Scanning this automatically fills the reference field.

---

## 6. Managing Vendors

**Navigate to:** Events → Vendors tab

### Reviewing Applications

All vendor applications appear in a list, sorted newest first. Each card shows:
- Brand name, owner, email, phone, Instagram
- Food categories
- Status badge (Pending / Approved / Declined)
- Description
- Logo (if uploaded)
- Menu (expandable)

### Approving a Vendor

1. Click **"Approve"** on the vendor card
2. The status changes to **Approved** immediately
3. The vendor is automatically **emailed** with their approval and next steps
4. They appear in the **public vendor directory**

### Declining a Vendor

1. Click **"Decline"**
2. A text area appears — enter a reason (optional but strongly recommended)
3. Click **"Confirm Decline"**
4. The status changes to **Declined**
5. The vendor is automatically **emailed** with the outcome (and reason, if entered)
6. They do **not** appear in the public vendor directory

### Revoking Approval

If an approved vendor needs to be removed:
1. Click **"Revoke"** on an approved vendor
2. Enter a reason (optional)
3. Click **"Confirm Revoke"**
4. Status changes to **Declined**
5. Vendor is emailed about the revocation
6. They are **removed from the public directory**

> **Always enter a reason when declining or revoking.** The reason is sent directly to the vendor in the automated email. Blank reasons leave vendors without context.

### Creating a Vendor Directly

Admins can add vendors who bypass the normal application form (e.g. returning partners):
1. Click **"+ Add Vendor"**
2. Fill in the vendor details (including optional brand logo upload)
3. Set the initial status as needed

### Editing a Vendor

Click the vendor card to open the detail drawer, then click **Edit**. Fields include:
- All contact and brand details
- **Brand Logo** — upload a square logo (shown in the vendor strip and directory)
- Menu categories and items

### Deleting a Vendor

Click the **trash icon** → confirm. This permanently removes the vendor from the system. Use with caution — it cannot be undone.

### Filtering Vendors

Use the status tabs at the top (**All / Pending / Approved / Declined**) to narrow down the list.

---

## 7. Managing the Gallery

**Navigate to:** Gallery (sidebar/nav)

### Adding Photos or Videos

1. Click **"+ Add Media"**
2. In the modal:
   - Select the **event** this media belongs to
   - Add one or more rows — each row has:
     - **Type** — Photo or Video
     - **URL** — direct link to the image or video
     - **Caption** — brief description
3. Click **"+ Add Row"** to add more items in one batch
4. Click **"Save All"** — all items are saved together

### Supported URLs
- **Photos:** Direct image URLs ending in `.jpg`, `.jpeg`, `.png`, `.webp`, or CDN links
- **Videos:** Direct video URLs (`.mp4`, `.webm`) or CDN video links

> Test your URL in a new browser tab before adding it. Broken links result in empty/broken media in the gallery.

### Tabs
Gallery items are organised by event. Use the event tabs at the top to browse items per event.

### Deleting Media

Click the **trash icon** on any gallery item → confirm. The item is removed from the public gallery immediately.

### Best Practices
- Upload photos and videos to a CDN (Cloudinary, Firebase Storage) first, then paste the URL here
- Use consistent captions — they appear on hover in the gallery
- Add media shortly after each event while it's still fresh

---

## 8. Managing Testimonials

**Navigate to:** Gallery → Testimonials tab

### What Admin-Created Testimonials Are

Testimonials can come from:
1. **User-submitted** — directly from the public site form
2. **Admin-created** — added by you (for curated quotes from attendees, press, etc.)

Only admin-created testimonials can be **edited or deleted** from this panel. User-submitted ones can only be deleted (not edited).

### Creating a Testimonial

1. Click **"+ Add Testimonial"**
2. Fill in:
   - **Name** — person's name or brand name
   - **Type** — Vendor (red badge) / Attendee (green badge) / Team (yellow badge)
   - **Role** — their role (e.g. "Food Vendor", "Event Attendee", "DJ")
   - **Quote** — the testimonial text
   - **Event** — which event they attended (optional)
3. Click **Save**

### Editing a Testimonial

Click the **pencil icon** on the testimonial card. Edit inline and save.

### Deleting a Testimonial

Click the **trash icon** → confirm. Works for both user-submitted and admin-created testimonials.

### Where Testimonials Appear

In the rotating carousel on the **Home, Events, Vendors, and About** pages under "What People Say".

---

## 9. Managing the Shop (Products)

**Navigate to:** Store → Products tab

### Adding a Product

1. Click **"+ Add Product"**
2. Fill in:

| Field | Notes |
|---|---|
| **Name** | Product name (e.g. "DAN Oversized Tee") |
| **Price** | In Naira |
| **Category** | T-Shirts / Hoodies / Caps / Tote Bags / Stickers / Limited |
| **Description** | Brief product description |
| **Image URL** | Direct product image URL. Test it first |
| **Accent Colour** | Yellow / Green / Red — card highlight colour |
| **Limited Edition** | Tick to add the "Limited" badge |
| **Stock** | Number of units available. `-1` = unlimited |
| **Active** | Checked = visible in public shop |

3. Click **Save Product**

### Editing a Product

Click the **pencil icon** on the product card. All fields are editable.

### Hiding / Showing a Product

Click the **eye icon** (👁) on any product card:
- **Eye open** → product is visible to the public
- **Eye closed** → product is hidden from the public shop (but not deleted)

Use this to temporarily hide out-of-stock or seasonal items without deleting them.

### Deleting a Product

Click the **trash icon** → confirm. This permanently deletes the product. If there are existing orders for this product, the orders remain in the system — the product record is just removed.

### The "Hot Pick" Badge

The product with the **highest number of units sold** (from live order data) automatically shows a 🔥 Hot Pick badge on the public shop. No manual action needed.

### Stock Management

- Set `stock` to the total number of units you have
- The system **automatically tracks sales** using a `soldCount` field
- Available units = `stock − soldCount`. When this reaches 0, the item shows "Sold Out"
- `-1` = unlimited stock (never shows "Sold Out")
- Do **not manually edit `soldCount`** — it is managed by the purchase and return flows automatically

---

## 10. Managing Orders

**Navigate to:** Store → Orders tab

### Order Status Tabs

| Tab | Description |
|---|---|
| **All Orders** | Every order in the system |
| **Pending** | Paid but not yet dispatched |
| **Dispatched** | Shipped/on the way |
| **Delivered** | Successfully delivered |
| **Returned** | Package sent back |

### Viewing Order Details

Click any order row to expand it. You'll see:
- Customer name, email, phone
- Delivery address
- Full item list with quantities and prices
- Total amount
- Paystack payment reference
- **Status trail** — full audit log of every status change with timestamps and notes

### Updating Delivery Status

Expand an order, then use the action buttons:

| Button | Use When |
|---|---|
| **Mark Dispatched** | You've handed the package to a courier |
| **Mark Delivered** | Customer has received the package |
| **Mark Returned** | Package came back (requires a note explaining why) |
| **Undo to Pending** | Reverse an action (requires a note explaining why) |

### Stock Impact of Status Changes

| Action | Stock Effect |
|---|---|
| Mark Dispatched | No change |
| Mark Delivered | No change |
| Mark Returned | Stock availability **restored** |
| Undo to Pending (from Returned) | Stock availability **reduced again** |

### Deleting an Order

Click the **trash icon** on the order row → confirm. Only delete orders that were duplicate entries, test transactions, or fully refunded and resolved.

---

## 11. Managing the Email List

**Navigate to:** Emails (sidebar/nav) → `dineatnight.com/admin/subscribers`

This section manages all contacts — newsletter subscribers and ticket buyers — and lets you send newsletters directly from the admin panel.

### Tabs

| Tab | What It Shows |
|---|---|
| **All Emails** | Combined list of newsletter subscribers + ticket buyers |
| **Newsletter** | Only newsletter sign-ups |
| **Ticket Buyers** | Only emails from paid ticket purchases |
| **Sent** | History of newsletters you've sent |

### Email Counts

The header shows two counts:
- `X newsletter` — active newsletter subscribers
- `X ticket buyers` — unique emails from paid tickets (deduplicated)

Suppressed emails (manually removed ticket buyers) are filtered out from all views.

### Copying and Exporting

- **Copy** — copies all visible emails as a comma-separated list to clipboard
- **Export** — downloads the current tab as an Excel (.xlsx) file with email, source, name, and event columns

### Deleting Individual Emails

Each row has a **trash icon** (always visible on mobile, hover-only on desktop):
- **Newsletter row** — deletes the subscriber document from Firestore. The user can re-subscribe after deletion.
- **Ticket row** — adds the email to a `suppressed_emails` list. The ticket record is not deleted (payment history preserved). The email is excluded from all future email lists and newsletters.

### Clear All Newsletter Subscribers

Click **Clear All** (appears when on the Newsletter or All tab) → confirm in the modal. This permanently deletes all newsletter subscriber documents at once. Cannot be undone.

### Sending a Newsletter

1. Click **Send Newsletter** (top right, always visible regardless of tab)
2. Fill in the compose form:
   - **Subject** — email subject line
   - **Message** — plain text body (automatically styled with Dine At Night branding)
   - **Page Link (optional)** — choose a site page to add a CTA button (Events, Vendors, Gallery, Shop, About, Contact, or a custom URL)
3. Click **Send to X recipients →**
4. The email is sent in batches of 50 via Resend
5. On success, the newsletter is saved to **Sent history**

Each recipient gets a **personalised unsubscribe link** at the bottom of the email. The email also includes a `List-Unsubscribe` header so Gmail shows a one-click unsubscribe button.

### Sent History

The **Sent** tab shows all newsletters you've sent:
- Subject, date, recipient count
- "+X new" badge if new contacts have joined since it was sent
- **Expand** a sent item to see the full message, link, and recipient list
- **Resend to New Users** — sends the same newsletter only to contacts who weren't in the original send
- **Delete** — removes the sent record (does not unsend the email)

---

## 12. Admin Maintenance

### Regular Tasks

**Before an event:**
- [ ] Create the event (Status: Draft first, then publish when ready)
- [ ] Set accurate ticket types, prices, and total capacity
- [ ] Add event image (wide banner, high quality)
- [ ] Review all pending vendor applications and approve/decline
- [ ] Send a newsletter announcing the event to your email list

**On event day:**
- [ ] Open the Confirm tab on a tablet/phone
- [ ] Ensure you have internet connectivity at the venue
- [ ] Assign at least 2 staff members to gate scanning
- [ ] Keep the admin login credentials accessible but secure

**After an event:**
- [ ] Mark the event as "Past" (tick "Mark as Past" in the edit form)
- [ ] Upload gallery photos and videos
- [ ] Process any pending/disputed orders
- [ ] Review and moderate new testimonials
- [ ] Send a post-event newsletter with gallery highlights

**Ongoing:**
- [ ] Check Orders tab regularly and update delivery statuses
- [ ] Respond to vendor applications within 3–5 business days
- [ ] Moderate user-submitted testimonials (delete inappropriate ones)
- [ ] Keep product stock levels accurate

### Keeping Data Clean

- **Do not leave events in "Active" status after they've ended**
- **Do not leave vendors in "Pending" for weeks**
- **Do not add placeholder/test data in production**

---

## 13. What to Avoid

### Events
| Action | Why to Avoid |
|---|---|
| Deleting events with ticket sales | Tickets reference the event; deleting breaks ticket records |
| Changing total ticket capacity below current sold count | Progress bar goes > 100% |
| Publishing an event without an image | Event card appears broken on public site |

### Vendors
| Action | Why to Avoid |
|---|---|
| Approving then immediately revoking | Triggers two automated emails in quick succession |
| Declining without a reason | Vendor has no feedback to improve their application |
| Creating duplicate vendor entries | System deduplicates by email — conflicts arise |

### Email List
| Action | Why to Avoid |
|---|---|
| Sending newsletters without a subject or body | Will be rejected by the API |
| Using "Clear All" carelessly | Permanently deletes all subscribers — irreversible |
| Sending to suppressed emails | The system filters these out automatically; no action needed |

### Shop
| Action | Why to Avoid |
|---|---|
| Deleting a product with existing orders | Orders remain but product card is gone |
| Setting stock to 0 during active sales | Doesn't cancel in-flight orders |

### Orders
| Action | Why to Avoid |
|---|---|
| Deleting legitimate paid orders | Permanent loss of delivery and revenue records |
| Skipping status updates | Customers have no delivery visibility |

### General
| Action | Why to Avoid |
|---|---|
| Sharing admin credentials | Each admin should have their own account |
| Staying logged in on shared devices | Session lasts 24 hours — anyone on the device has access |

---

## 14. Security Practices

### Credentials
- Use a **strong, unique password** for your admin Firebase account
- Never share your password via WhatsApp, email, or any messaging app

### Session Management
- Always **Sign Out** when done, especially on shared or borrowed devices
- If you suspect your account was compromised, contact the technical team to revoke your session

### Environment Variables
- Never share `.env.local` or Vercel environment variables with unauthorised people
- `PAYSTACK_SECRET_KEY`, `SESSION_SECRET`, `RESEND_API_KEY`, and `ADMIN_EMAILS` are especially sensitive
- If any key is exposed, rotate it immediately

### Email Notifications
The system automatically emails vendors when you approve, decline, or revoke their application. **Be professional — these emails are on record.**

---

## 15. Adding / Removing Admins

Only the technical team can add or remove admins.

### To Add an Admin
1. Create a Firebase Auth account for them (Firebase Console → Authentication → Add User)
2. Add their email to `ADMIN_EMAILS` in Vercel environment variables
3. Redeploy or wait for the next deployment

### To Remove an Admin
1. Remove their email from `ADMIN_EMAILS` in Vercel → redeploy
2. Disable or delete their Firebase Auth account (Firebase Console)
3. Their session cookie expires within 24 hours

> There is no instant session revocation. Plan around the 24-hour window.

---

## 16. Troubleshooting

### "Firebase Not Configured" error on admin pages
The Firebase environment variables are missing from Vercel. Add all `NEXT_PUBLIC_FIREBASE_*` keys and redeploy.

### Login fails with "Invalid email or password"
- Check the email is registered in Firebase Auth
- Check the email is in the `ADMIN_EMAILS` Vercel variable
- Reset the Firebase Auth password from the Firebase Console

### Newsletter send returns "Unauthorised"
The `SESSION_SECRET` env var may be missing in Vercel. Add it and redeploy.

### Newsletter emails going to spam
- Ensure the sending domain is verified in the Resend dashboard
- The `List-Unsubscribe` header is added automatically — this helps over time
- New domains take 2–4 weeks to build inbox reputation

### Vendor email not received after status change
- Vendor should check spam/junk folder
- Check `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in Vercel

### Gallery images not loading
Image URLs may be broken or hotlink-protected. Test the URL in a private browsing tab, then re-upload to Firebase Storage and use the new URL.

### Ticket confirm shows "Not Found" for a valid ticket
- Reference must be exact (case-sensitive)
- If payment was made but ticket is missing, check Paystack webhook logs

### The Paystack webhook stopped firing
Verify the webhook URL in Paystack dashboard is `https://dineatnight.com/api/paystack/webhook` and the secret matches `PAYSTACK_SECRET_KEY` in Vercel.

---

*For technical issues beyond this guide, contact the development team.*

*Last updated: March 2026 | Dine At Night Admin System*
