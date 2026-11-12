# Errors and debugging

How the site reports errors, and where to look when something breaks.

## The rule: plain messages on screen, details in the logs

Everyone who sees an error message — ticket buyers, vendors, gate staff and
admins — gets plain language that says what happened and what to do next.
Technical detail (env var names, Firestore, status codes, stack traces) never
goes on screen. It goes to `console.error` with a `[route-name]` prefix so a
developer can find it.

```ts
// ✅ Do
console.error("[paystack/initialize] PAYSTACK_SECRET_KEY is not set");
return NextResponse.json(
  { error: "Ticket sales are temporarily unavailable. Please try again shortly." },
  { status: 500 },
);

// ❌ Don't
return NextResponse.json({ error: "Server misconfiguration: PAYSTACK_SECRET_KEY missing" }, { status: 500 });
```

Guidelines for the on-screen text:

- Say what happened, then what to do: *"Couldn't load events. Refresh the page —
  if it keeps happening, contact the site developer."*
- Public pages: point to a next step the visitor can take (retry, refresh, email
  contact@dineatnight.com).
- Staff/admins: "contact an admin" (gate staff) or "contact the site developer"
  (admins) when only a developer can fix it.
- Client pages must not assume the server replies with JSON — a crashed route
  returns an HTML error page. Use `await res.json().catch(() => null)` and show
  a plain message when it's `null`, instead of a misleading "Network error".

Two internal strings are allowed because nobody reads them on screen:

- `"Server misconfiguration"` from `/api/admin/session` — a signal that
  `app/admin/login/page.tsx` turns into a friendly message (it logs the
  `missing` list to the browser console).
- The Paystack webhook's error replies — only Paystack reads them.

## Where to find the details

| Running | Where the logs are |
|---|---|
| Live site | **Vercel → Project → Logs** (filter by the route path or the `[prefix]`) |
| Local (`npm run dev`) | The terminal running the dev server |
| Admin login problems | The **browser console** (F12 → Console) on `/admin/login` |

## On-screen message → likely cause

| What the person sees | Log prefix | Usual cause and fix |
|---|---|---|
| "Ticket sales are temporarily unavailable…" (checkout) | `[paystack/initialize]` | `PAYSTACK_SECRET_KEY` not set — add it in Vercel and redeploy. |
| "Checkout is temporarily unavailable…" (shop) | `[merch/initialize]` | `PAYSTACK_SECRET_KEY` not set, or a `sk_test_` key in production. |
| "Admin sign-in isn't available right now…" | browser console `[admin login]` | The console lists what's missing: `SESSION_SECRET`, `ADMIN_EMAILS` or `FIREBASE_SERVICE_ACCOUNT`, or the service account is for a different Firebase project. |
| "This account doesn't have admin access…" | browser console `[admin login]` | The email isn't in `ADMIN_EMAILS`. |
| "Scanning isn't available right now…" (`/scan`) | `[scan/login]` | `SESSION_SECRET` not set. |
| "Scanner codes can't be created right now…" | `[admin/scanners]` | `SESSION_SECRET` not set. |
| "Emails can't be sent right now…" (Test Emails, newsletter) | `[test-email]`, `[newsletter]` | `RESEND_API_KEY` not set. |
| A test email "couldn't send" / a customer got no email | `[resend]` | `RESEND_API_KEY is not set — email not sent`, or a Resend error (unverified sender domain, rate limit). Check the Resend dashboard → Emails. |
| "Vendors couldn't load right now…" (homepage) | `[GET /api/vendors]` | Usually `FIREBASE_SERVICE_ACCOUNT` missing/invalid. |
| "Couldn't load the dashboard / events…" (admin) | browser console | Firestore rules or the admin's `admin` claim — sign out and back in to refresh it. |
| "This email still has text to fill in: […]" (vendor email) | — | Intended: the Email Templates draft still has `[bracketed]` gaps. Fill them in. |

## Environment setup gotchas

- **`FIREBASE_SERVICE_ACCOUNT` must be the JSON contents, not a file name.**
  A value like `serviceAccountKey.json` fails with
  `Unexpected token 's', "serviceAcc"... is not valid JSON`.
  In `.env.local` put the minified JSON in **single quotes** — with double
  quotes, dotenv turns the private key's `\n` into real line breaks and the JSON
  breaks. In Vercel, paste the JSON as-is with no quotes. To write it into
  `.env.local` from the downloaded key file without printing it:

  ```powershell
  node -e "const fs=require('fs');const key=JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],'utf8')));const lines=fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('FIREBASE_SERVICE_ACCOUNT='));lines.push('FIREBASE_SERVICE_ACCOUNT='+String.fromCharCode(39)+key+String.fromCharCode(39));fs.writeFileSync('.env.local',lines.join('\n')+'\n')" "C:\path\to\firebase-adminsdk-key.json"
  ```

  Keep the key file outside the project folder — git does not ignore `.json` files.

- **`Firebase: Error (auth/invalid-api-key)`** on any page means the
  `NEXT_PUBLIC_FIREBASE_*` values are missing from `.env.local`. They are baked
  in when the dev server starts — restart `npm run dev` after editing.

- **Missing `RESEND_API_KEY` locally** no longer crashes routes (the Resend
  client is created on first send in `lib/resend.ts`); emails just fail and log
  `[resend] RESEND_API_KEY is not set`.

- **Node version:** `package.json` pins `"engines": { "node": "24.x" }`. An
  open range like `>=22` made Vercel build on the newest Node (26) instead of
  the project setting. CI uses Node 24 too.

## Payments: things that have bitten us

- **Ticket emails are sent by `deliverPaidTicket()` (`lib/ticketDelivery.ts`),
  from whichever of the Paystack webhook or `/api/paystack/verify` marks the
  order paid first.** Previously only the verify page sent the email, so when
  the webhook won the race no email went out at all. If a buyer says they got no
  email, check `[webhook]` / `[verify]` and `[resend]` logs, then use
  **Admin → Tickets → Resend** (same ticket and QR code, never a new one).
- **Set the Paystack webhook** (Dashboard → Settings → API Keys & Webhooks,
  Live mode) to `https://www.dineatnight.com/api/paystack/webhook`. Without it,
  tickets are only confirmed when the buyer returns to the site.
- Orders "sent to different emails" are split inside `markTicketPaid()` in the
  same transaction that marks them paid — guest tickets are `<reference>-2`,
  `<reference>-3`, … with `parentReference` pointing at the buyer's ticket.
