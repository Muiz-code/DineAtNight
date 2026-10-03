# Dine At Night

Website and admin panel for **Dine At Night**, Nigeria's first night food market
(Lagos): events and ticket sales, vendor directory and applications, merch shop,
gallery, testimonials and newsletter. Live at [dineatnight.com](https://www.dineatnight.com).

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| Data / files / login | Firebase (Firestore, Storage, Auth) — Admin SDK on the server |
| Payments | Paystack |
| Email | Resend |
| Hosting | Vercel |

## Quick start

Requires Node.js 22+.

```bash
npm install
# create .env.local — see DEVELOPER_GUIDE.md §3 for every variable
npm run dev
```

Open http://localhost:3000. The admin panel is at `/admin`.

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Documentation

| Doc | For |
|---|---|
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Developers: setup, env vars, architecture, payments, security rules, deployment |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Staff using the admin panel |
| [USER_GUIDE.md](USER_GUIDE.md) | How the public site works |
| [docs/CHECKIN_INTEGRATION.md](docs/CHECKIN_INTEGRATION.md) | External check-in system developers |

## Deploying

`master` deploys to Vercel automatically. Security rules (`firestore.rules`,
`storage.rules`) are deployed separately with the Firebase CLI — after the code.
See [DEVELOPER_GUIDE.md §16](DEVELOPER_GUIDE.md#16-deployment) for the checklist.
