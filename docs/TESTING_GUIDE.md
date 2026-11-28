# Testing guide: coupon codes and entry time slots

A step-by-step check of the coupon codes (Tickets → Coupons) and the ticket-type entry
times at the gate, before giving real codes to a sponsor or selling time-slot tickets.
Takes about 45 minutes. Tick each box as you go.

Background: [ADMIN_GUIDE.md](../ADMIN_GUIDE.md) sections 3 (Entry Times), 4b (Coupon
Codes) and 5 (Gate Scanning).

---

## 0. Before you start

**Read this first: the local site uses the live database.** `.env.local` points at the
real Firebase project (`dine-at-night`). Anything you create locally (the test event,
tickets, coupon campaigns) is real data, and an **Active** event shows on the public
site. So:

- Name everything **TEST**, e.g. event "TEST — do not buy", campaigns "TEST free".
- Keep the test event Active only while testing, and switch it to **Draft** at the end (step 6).

Setup:

- [ ] **Automated tests pass:** run `npm test`. Expect `140 passed`.
- [ ] **Paystack test key:** add your **test** secret key to `.env.local`
      (Paystack dashboard → switch to **Test mode** → Settings → API Keys & Webhooks):
      ```
      PAYSTACK_SECRET_KEY=sk_test_...
      ```
      Never use the `sk_live_` key locally. Without any key, checkout (including free claims)
      shows "Ticket sales are temporarily unavailable".
- [ ] **Meta Pixel off:** put `#` in front of the `NEXT_PUBLIC_META_PIXEL_ID=` line in `.env.local`
      so test purchases don't reach the client's ad stats.
- [ ] Restart `npm run dev` after editing `.env.local`.
- [ ] Have two browsers ready (e.g. a normal window and a private one) to act as two buyers,
      and an inbox you can check (the ticket emails go to whatever address you enter).

**Paystack test card:** in test mode the checkout page lists test cards. The standard
one is `4084 0840 8408 4081`, CVV `408`, any future expiry. No real money moves.

**Scanning locally:** use **Admin → Tickets → Scan Ticket** and type the ticket reference.
The phone camera needs the deployed (https) site.

---

## 1. Create the test event

Admin → Events → New event:

- **Title:** `TEST — do not buy`
- **Date:** **today**. Entry times are checked against the event's date, so it must be today.
- **Status:** Active
- **Ticket types:** add these four, all at **₦1,000**. Work the times out from the current
  time (examples assume it's 2:00 PM now):

| Name | Entry from | Until | Purpose |
|---|---|---|---|
| `Test Later` | now + 2h (4:00 PM) | now + 4h (6:00 PM) | "Too early" |
| `Test Now` | now − 1h (1:00 PM) | now + 2h (4:00 PM) | Admitted |
| `Test Ended` | now − 3h (11:00 AM) | now − 1h (1:00 PM) | "Entry closed" |
| `Test Any` | *(empty)* | *(empty)* | No time slot |

- [ ] Under each tier the editor shows **"Gate admits … → … (Lagos time)"** with the times you
      expect. `Test Any` says "No entry times — this ticket can enter any time".
- [ ] Setting only "Entry from" on a tier and saving shows: *"Set both the entry start and end
      time for …, or clear both."* Fix it and save.
- [ ] A **Gate entry times** box appears. Leave both boxes **unticked** for now.

---

## 2. Create the test coupon campaigns

Admin → Tickets → **Coupons** → New campaign.

**Campaign A, free codes:**
- Name `TEST free`, event `TEST — do not buy`, **100%**, ticket types: **only `Test Now`**,
  **Unique codes**, **4** codes, **No expiry**.
- [ ] After creating, the campaign page opens with codes `#1`–`#4` like `DAN-7KQ2X9`, all **Unused**.
- [ ] **Copy codes** copies the 4 codes. **Export** downloads an Excel file listing them as Unused.

**Campaign B, shared half-price code:**
- Name `TEST half`, same event, **50%**, no ticket types chosen (works for all),
  **One shared code** `TESTHALF`, total uses **2**, No expiry.
- [ ] Creating a second campaign with the code `TESTHALF` again is refused: *"The code TESTHALF is
      already used by another campaign."*

Write down codes #1–#4 of campaign A; each step below says which to use.

---

## 3. Coupon checkout tests

Open the public site → Events → TEST event → buy tickets. On the last step (**Review & pay**)
there's a **Have a code?** box.

### 3.1 Free ticket (code A#1)
1 × `Test Now`, enter code A#1 **in lower case without the dash** (e.g. `dan7kq2x9`) → Apply.
- [ ] The code is accepted and shows in its proper form (`DAN-7KQ2X9`).
- [ ] The summary shows **"Code DAN-… · 100% off 1 ticket −₦1,000"** and Total **Free**.
- [ ] The button says **Claim free ticket →** and the note says *"No payment needed."*
- [ ] Clicking it goes **straight to the ticket page, with no Paystack**. The reference starts with `FREE-`.
- [ ] The ticket page shows Ticket Type `Test Now`, **Entry** with the slot times, Amount Paid **Free**,
      and **Code** `DAN-… (100% off 1 ticket)`.
- [ ] The email arrives with **Entry** and **Amount Paid: Free** rows.
- [ ] Admin → Coupons → TEST free: code **#1** shows **Used** with your name, email and reference;
      the count shows **1/4 used**.
- [ ] Admin → Tickets (TEST event): the order shows the green line
      **"Code DAN-… (#1 of 4, TEST free) | 100% off 1 ticket | -₦1,000 | Free, no Paystack payment"**.

### 3.2 A used code is refused (code A#1 again)
In the other browser, 1 × `Test Now`, code A#1.
- [ ] *"This code has already been used."* The order can't use it.

### 3.3 Wrong ticket type (code A#2)
1 × `Test Any`, code A#2.
- [ ] *"This code only works for Test Now tickets."*
- [ ] Apply A#2 on `Test Now`, then go back and switch to `Test Any`: the code **drops off** the order.

### 3.4 Several tickets: the discount comes off one ticket (code A#2)
**3** × `Test Now`, code A#2.
- [ ] Summary: 3 × ₦1,000 = ₦3,000, discount **−₦1,000**, Total **₦2,000**. A note says you pay for the other 2.
- [ ] The button says **Pay ₦2,000 via Paystack**, and the Paystack page asks for **₦2,000**. Pay with the test card.
- [ ] After payment: the ticket says 3×, Amount Paid ₦2,000, Code shown.
- [ ] Admin → Coupons: A#2 shows **Used** (the Export says *Used (paid)*). Admin → Tickets **Export**: the coupon columns show
      code, `2 of 4`, `TEST free`, 100, discount 1000, full price 3000.

### 3.5 Code held while someone is paying (code A#3)
Browser 1: **2 × `Test Now`** with code A#3 (₦1,000 to pay), click Pay, and **stop on the
Paystack page without paying**.
- [ ] Browser 2: apply A#3 → *"This code has already been used."* (It's held during checkout.)
- [ ] Admin → Coupons: A#3 shows **At checkout now**.
- [ ] *(Optional, takes 15 min)* Wait 15 minutes without paying: A#3 works again in browser 2.

### 3.6 Part-price code through Paystack (TESTHALF)
1 × `Test Any`, code `testhalf`.
- [ ] Discount −₦500, Total **₦500**, and Paystack asks for **₦500**. Pay.
- [ ] Use `TESTHALF` once more (any tier, ₦500) and pay.
- [ ] A third time: *"This code has reached its limit."*
- [ ] Admin → Coupons → TEST half shows **2 of 2 used**. Export lists **both** uses.

### 3.7 Pause and expiry (code A#4)
- [ ] Coupons → TEST free → **Pause codes**. At checkout, A#4: *"This code is no longer active."*
- [ ] **Resume codes**: A#4 is accepted again (don't claim it).
- [ ] Set **Valid until** to a date. The campaign header shows "Valid until …". Click **No expiry**
      to remove it. (An expired code says *"This code has expired."*; the automated tests cover
      that because the admin page only accepts future dates.)

### 3.8 Bad codes
- [ ] A made-up code (`NOPE1234`): *"That code isn't valid. Check it and try again."*
- [ ] **Remove** on an applied code puts the price back to normal.

---

## 4. Entry time tests at the gate

You need one ticket for each tier. You already have `Test Now` (3.1, 3.4) and `Test Any` (3.6)
tickets. Buy **2 × `Test Later`** as separate orders and **1 × `Test Ended`** with the Paystack
test card (₦1,000 each).

- [ ] At checkout each tier button shows **"Entry 4:00 PM – 6:00 PM"** (etc.), and the selected
      tier explains that arrivals outside it are turned away. `Test Any` shows no entry line.

Admin → Tickets → **Scan Ticket**, type each reference:

| Ticket | Expected |
|---|---|
| `Test Later` #1 | [ ] **⏳ Too Early**: "entry is 4:00 PM – 6:00 PM. Entry opens [today] 4:00 PM. Do not admit yet." No Admit anyway button |
| same ticket in Admin → Tickets | [ ] still **Awaiting check-in** (not used up) |
| `Test Now` | [ ] **Admitted!** |
| `Test Ended` | [ ] **⛔ Entry Closed**: "…closed [today] 1:00 PM. Do not admit." |
| `Test Any` | [ ] **Admitted!** |

### 4.1 Early-arrival grace
Edit the event → Gate entry times → tick **Let early arrivals in up to `150` minutes** → Save.
- [ ] The `Test Later` preview now ends in "— includes early grace" and opens 2½ hours earlier.
- [ ] Scan `Test Later` #1 → **Admitted!**
- [ ] Untick the grace box and save.

### 4.2 Override (Admit anyway)
Edit the event → tick **Allow gate staff to Admit anyway** → Save.
- [ ] Scan `Test Later` #2 → **Too Early** with an **Admit anyway** button.
- [ ] Click it: a confirmation asks. Cancel → nothing happens. Click again → OK → **Admitted!** with
      *"Admitted outside its entry time (early) — override recorded."*
- [ ] Admin → Tickets: the order shows **"Admitted outside entry time by [your name]"**, and the
      export's **Entry Override** column says `early — by [your name]`.
- [ ] Scan `Test Ended` → **Entry Closed** with Admit anyway (late entry can be overridden too).
      Don't click it.
- [ ] Untick the override box and save. Scanning `Test Ended` again shows **no** button.

### 4.3 Staff scanner (optional)
If gate staff use their own login (`/scan`), repeat one Too Early scan there to check they see
the same message and, with override on, the same button.

---

## 5. Terms page

- [ ] `/terms`, point **8. Entry**, ends with the sentences about entry time slots.

---

## 6. Clean up

- [ ] Event `TEST — do not buy` → **Draft** (or delete it). It's on the live site while Active.
- [ ] Coupons → `TEST free` and `TEST half` → **Pause codes**.
- [ ] `.env.local`: remove the `#` from the Meta Pixel line if you want it back. Keep the Paystack
      **test** key locally if you like, but **never** put a test key in Vercel's Production settings.
- [ ] The test tickets stay in the database (tickets can't be deleted from admin). They're on
      the draft TEST event, so they don't affect real events.

---

## 7. Going live

1. Deploy, then check one thing on production with real money kept at zero: create a
   **1-code, 100%** campaign named `LIVE CHECK` on the real event's cheapest tier, claim it
   yourself, and check the email arrives. Pause the campaign afterwards. This uses up one real
   ticket from that tier's stock.
2. Create the sponsor's real campaign (e.g. 40 unique codes, 100%, Night Market Pass only,
   with an expiry date) and **Export** the codes for the sponsor.
3. Set the real event's tier entry times, grace and override, and check the "Gate admits…" preview
   under each tier.
4. On event day, scan with the deployed site (`/scan` or Admin → Scan Ticket).

---

## If something fails

The page shows a plain message; the technical detail is in the browser console (local) or
Vercel logs (deployed). Search the logs for:

| Area | Log prefix |
|---|---|
| Checkout "Apply" | `[tickets/coupon]` |
| Checkout / free claim | `[paystack/initialize]` |
| Payment confirmation | `[verify]`, `[webhook]`, `[payments]` |
| Admin Coupons page | `[admin/coupons` |
| Gate scan | `[scan/confirm]` |

More in [DEBUGGING.md](DEBUGGING.md).
