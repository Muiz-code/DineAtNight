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
11. [Admin Maintenance](#11-admin-maintenance)
12. [What to Avoid](#12-what-to-avoid)
13. [Security Practices](#13-security-practices)
14. [Adding / Removing Admins](#14-adding--removing-admins)
15. [Troubleshooting](#15-troubleshooting)

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
**Desktop:** Left sidebar with 4 main sections — Dashboard, Events, Gallery, Store.

**Mobile:** Bottom tab bar with the same 4 sections + top header with sign out.

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
- Image slideshow (if multiple images were submitted)
- Menu (expandable)

### Approving a Vendor

1. Click **"Approve"** on the vendor card
2. The status changes to **Approved** immediately
3. The vendor is automatically **emailed** (via EmailJS) with their approval and next steps
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
2. Fill in the vendor details
3. Set the initial status as needed

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
- **Photos:** Direct image URLs ending in `.jpg`, `.jpeg`, `.png`, `.webp`, or CDN links (e.g. Cloudinary, Imgur, Google Drive public links)
- **Videos:** Direct video URLs (`.mp4`, `.webm`) or CDN video links

> Test your URL in a new browser tab before adding it. Broken links result in empty/broken media in the gallery.

### Tabs
Gallery items are organised by event. Use the event tabs at the top to browse items per event.

### Deleting Media

Click the **trash icon** on any gallery item → confirm. The item is removed from the public gallery immediately.

### Best Practices
- Upload photos and videos to a CDN (Cloudinary, Imgur) first, then paste the URL here
- Use consistent captions — they appear on hover in the gallery
- Add media shortly after each event while it's still fresh

---

## 8. Managing Testimonials

**Navigate to:** Gallery → Testimonials tab (or via sidebar for some layouts)

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

- Set `stock` to the actual number of units you have
- The system does **not** automatically decrement stock on purchase — you must update this manually
- When stock reaches 0 (or you toggle a product inactive), it becomes unavailable on the shop
- `-1` = unlimited stock (no out-of-stock state)

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

> The **"Returned"** and **"Undo to Pending"** actions open a note modal. Always enter a reason — it's recorded in the status trail and visible to you later.

### Status Trail (Audit Log)

Every status change is logged in `statusHistory[]` with:
- Status value
- Timestamp
- Your note

This is your delivery audit trail — treat it as a paper trail for disputes.

### Deleting an Order

Click the **trash icon** on the order row → confirm. Only delete orders that were:
- Duplicate entries
- Test transactions
- Refunded and resolved

> Never delete a legitimate order without first recording the reason and outcome elsewhere.

---

## 11. Admin Maintenance

### Regular Tasks

**Before an event:**
- [ ] Create the event (Status: Draft first, then publish when ready)
- [ ] Set accurate ticket types, prices, and total capacity
- [ ] Add event image (wide banner, high quality)
- [ ] Review all pending vendor applications and approve/decline
- [ ] Test the ticket purchase flow with a test card (Paystack test mode)

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

**Ongoing:**
- [ ] Check Orders tab regularly and update delivery statuses
- [ ] Respond to vendor applications within 3–5 business days
- [ ] Moderate user-submitted testimonials (delete inappropriate ones)
- [ ] Keep product stock levels accurate

### Keeping Data Clean

- **Do not leave events in "Active" status after they've ended** — this confuses the countdown timers and buy buttons
- **Do not leave vendors in "Pending" for weeks** — they will follow up; process applications promptly
- **Do not add placeholder/test data in production** — it shows on the public site

---

## 12. What to Avoid

### Events
| Action | Why to Avoid |
|---|---|
| Deleting events with ticket sales | Tickets reference the event ID; deleting breaks ticket records |
| Changing total ticket capacity below current sold count | The progress bar goes > 100%, confusing the public UI |
| Publishing an event without an image | The event card appears broken on the public site |
| Using a non-working image URL | Broken card image on public site |

### Vendors
| Action | Why to Avoid |
|---|---|
| Approving a vendor and then immediately revoking | Triggers two automated emails in quick succession |
| Declining a vendor without a reason | Vendor has no feedback to improve their application |
| Creating duplicate vendor entries | The system deduplicates by email — two entries with the same email will conflict |

### Gallery
| Action | Why to Avoid |
|---|---|
| Adding hundreds of items at once | The gallery page loads all items; very large galleries will slow it down |
| Using broken or private image URLs | Results in broken images in the public gallery |
| Adding items without assigning them to an event | They won't appear in event-filtered views |

### Shop
| Action | Why to Avoid |
|---|---|
| Deleting a product that has existing orders | Orders will still show the product name (stored in order), but the product card is gone. Reconciliation becomes harder |
| Setting stock to 0 while orders are in progress | Doesn't cancel in-flight orders, just prevents new ones |
| Changing a product's price mid-event | Doesn't affect completed orders, but can confuse customers who saw the old price |

### Orders
| Action | Why to Avoid |
|---|---|
| Deleting legitimate paid orders | Permanent. Loss of delivery and revenue records |
| Skipping the status update flow | Customers have no visibility into their delivery; they'll contact support |
| Not entering reasons on Returned / Undo actions | Status trail becomes useless for dispute resolution |

### General
| Action | Why to Avoid |
|---|---|
| Sharing admin credentials | Each admin should have their own Firebase Auth account |
| Staying logged in on shared devices | Session lasts 24 hours — anyone on the device can access the admin |
| Making changes without checking the public site | Some changes are immediate — preview after every publish |

---

## 13. Security Practices

### Credentials
- Use a **strong, unique password** for your admin Firebase account
- Do not reuse your admin password anywhere else
- Never share your password via WhatsApp, email, or any messaging app

### Session Management
- Always **Sign Out** when done, especially on shared or borrowed devices
- If you suspect your account was compromised, contact the technical team immediately to revoke your session

### Environment Variables
- Never share `.env.local` or Vercel environment variables with unauthorised people
- The `PAYSTACK_SECRET_KEY` and `ADMIN_EMAILS` variables are especially sensitive
- If any key is exposed, rotate it immediately (Paystack dashboard + Vercel env)

### Email Notifications
The system automatically emails vendors when you:
- Approve their application
- Decline their application (with your reason)
- Revoke their approval (with your reason)

These emails go directly to the vendor's inbox. **Be professional — they are on record.**

---

## 14. Adding / Removing Admins

Only the technical team can add or remove admins. Here's what's needed:

### To Add an Admin
1. Create a Firebase Auth account for them (Firebase Console → Authentication → Add User)
2. Add their email to `ADMIN_EMAILS` in Vercel environment variables
3. Redeploy or wait for the next deployment (env vars take effect on next request)
4. Share their login credentials securely

### To Remove an Admin
1. Remove their email from `ADMIN_EMAILS` in Vercel (they can no longer log in)
2. Disable or delete their Firebase Auth account (Firebase Console)
3. If they're currently logged in, their session cookie will expire within 24 hours

> There is no instant session revocation — removing from `ADMIN_EMAILS` prevents new logins but doesn't kill active sessions immediately. Plan around the 24-hour window.

---

## 15. Troubleshooting

### "Firebase Not Configured" error on admin pages
The Firebase environment variables (`NEXT_PUBLIC_FIREBASE_*`) are missing from Vercel. Go to Vercel → Project Settings → Environment Variables and add all 6-7 Firebase keys. Redeploy.

### Login fails with "Invalid email or password"
- Check you're using the correct email (same one registered in Firebase Auth)
- Check your email is in the `ADMIN_EMAILS` Vercel variable
- Try resetting your Firebase Auth password from the Firebase Console

### Admin panel shows a blank screen or spinning loader after login
Wait 5–10 seconds — the auth check is in progress. If it persists, sign out and back in.

### Vendor email not received after status change
- The vendor should check their spam/junk folder
- EmailJS env vars may be missing — check `NEXT_PUBLIC_EMAILJS_*` in Vercel
- If EmailJS dashboard shows the email was sent, the issue is on the vendor's mail server side

### Gallery images not loading
The image URLs may be broken or from a source that blocks external embedding (hotlink protection). Test the URL in a new private browsing tab. If it fails, re-upload the image to a CDN (e.g. Cloudinary) and use the new URL.

### Orders not appearing in real-time
The orders page uses a live Firestore subscription. If orders aren't appearing:
1. Refresh the page
2. Check your internet connection
3. Check the Firebase Console — if Firestore is down (rare), wait and retry

### Ticket confirm shows "Not Found" for a valid ticket
- Check the reference code — it must be exact (case-sensitive)
- The ticket may be under the wrong event (check in the Tickets tab)
- If payment was made but the ticket doesn't exist, check the Paystack webhook logs in the Paystack dashboard

### The Paystack webhook stopped firing
Log in to the Paystack dashboard → Settings → API Keys & Webhooks → verify the webhook URL is `https://dineatnight.com/api/paystack/webhook` and the secret key matches `PAYSTACK_SECRET_KEY` in Vercel.

---

*For technical issues beyond this guide, contact the development team.*

*Last updated: March 2026 | Dine At Night Admin System*
