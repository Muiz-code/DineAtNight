# Dine At Night — Check-in Integration

Two ways for your check-in system to receive paid tickets. Use either or both.

| | Push (we call you) | Pull (you call us) |
|---|---|---|
| When | Within seconds of each confirmed payment | Whenever your system polls |
| Auth | We sign each request (HMAC-SHA256) | You send an API key |
| Best for | Real-time entry lists | Initial import, back-fill, reconciliation |

A ticket is only sent once Paystack has confirmed the payment **and** the amount
matches the ticket price.

---

## Ticket object

Both options use the same shape:

```json
{
  "reference": "T8FJ2K4L9Q",
  "eventId": "aB3dE5fG7h",
  "eventTitle": "Dine At Night — April Edition",
  "name": "Ada Obi",
  "email": "ada@example.com",
  "phone": "08012345678",
  "quantity": 2,
  "ticketType": "VIP",
  "amountNaira": 30000,
  "currency": "NGN",
  "status": "paid",
  "checkedIn": false,
  "purchasedAt": "2026-10-03T14:21:07.000Z",
  "paidAt": "2026-10-03T14:22:41.000Z",
  "checkedInAt": null
}
```

| Field | Notes |
|---|---|
| `reference` | Unique booking reference (Paystack reference). **Use this as your primary key.** |
| `quantity` | One reference can admit several people. |
| `ticketType` | Tier name, or `null` for single-price events. |
| `status` | `paid`, or `confirmed` once scanned at our gate. |
| `paidAt` | May be `null` for tickets paid before this integration went live. |
| Timestamps | ISO 8601, UTC. |

### Matching our QR codes
Each ticket's QR code contains a URL:
`https://www.dineatnight.com/admin/confirm?ref=<reference>`
Read the `ref` query parameter to get the `reference`.

---

## Option A — Push (webhook)

We send a `POST` to your endpoint for every newly paid ticket.

**Request**
```
POST <your endpoint>
Content-Type: application/json
X-DAN-Event: ticket.paid
X-DAN-Delivery: <reference>
X-DAN-Signature: sha256=<hex HMAC-SHA256 of the raw body, using the shared secret>

{ "event": "ticket.paid", "ticket": { ...ticket object... } }
```

**Your endpoint must**
1. Verify the signature against the **raw** request body before parsing it.
2. Respond `2xx` within 8 seconds. Any other result is retried once.
3. Be idempotent: treat `reference` as unique (the same ticket may arrive twice).

**Verifying the signature (Node.js)**
```js
const crypto = require("crypto");

function isFromDineAtNight(rawBody, signatureHeader, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

If a delivery fails twice it is not retried automatically. Use the Pull API to
back-fill anything missed.

---

## Option B — Pull (API)

```
GET https://www.dineatnight.com/api/checkin/tickets
Authorization: Bearer <API key>
```

| Query param | Description |
|---|---|
| `eventId` | Optional. Only tickets for this event. |
| `limit` | Optional. Page size 1–500 (default 500). |
| `cursor` | Optional. The `nextCursor` value from the previous page. |

**Response**
```json
{ "tickets": [ { ...ticket object... } ], "nextCursor": "T8FJ2K4L9Q" }
```

Keep requesting with `cursor=<nextCursor>` until `nextCursor` is `null`.
A page can contain fewer than `limit` tickets; that does not mean you've reached the end.

Each call returns the **full current list** (paid and checked-in tickets), so a
periodic full sync keyed on `reference` is the simplest approach. Please poll no
more than once a minute.

**Errors:** `401` bad or missing key · `400` invalid parameter · `404` API not enabled · `500` server error.

---

## Setup (Dine At Night side)

Set in Vercel → Settings → Environment Variables, then redeploy:

| Variable | For | Value |
|---|---|---|
| `CHECKIN_WEBHOOK_URL` | Push | Your HTTPS endpoint |
| `CHECKIN_WEBHOOK_SECRET` | Push | Long random string, shared with you privately |
| `CHECKIN_API_KEY` | Pull | Long random string, shared with you privately |

Each option is disabled until its variables are set. Secrets are exchanged
through a private channel, never by email in plain text.

Delivery status for push is recorded on each ticket (`checkinPushedAt` on
success, `checkinPushError` on failure).
