# SPA Enterprise – online store

The website for **SPA Enterprises, Delhi** – authorised distributor of National Geographic bags & luggage and Shraddha brass jewellery. One Next.js app (shop + admin + automation), a Postgres database, hosted on Vercel.

## What it does

**Shop (spaenterprise.in)**
- Catalogue with search, brand/category filters and sorting; a page per product (`/p/...`) with photos, MRP discount, stock status, WhatsApp button and Google-ready product data.
- Cart and checkout without an account: Razorpay (UPI, cards, net banking) and/or Cash on Delivery, coupon codes, free delivery in Delhi NCR and above the free-shipping amount.
- Order confirmation page, order tracking (order number + mobile), "My orders" for signed-in customers.
- Bulk / corporate quote, dealer, contact and warranty forms – they arrive in the admin as leads.
- Store policies (required by Razorpay), sitemap and robots for Google.

**Admin (`/admin`)** – the team signs in at `/login`
- **Overview:** today's work (orders to pack, new leads, comments, low stock) and, for the owner, revenue, orders, average order value, COD to collect, daily revenue and best sellers.
- **Orders:** status, courier + tracking number (shown to the customer), COD cash collected, one-tap WhatsApp update to the customer. Cancelling puts stock back.
- **Products & stock:** add/edit/hide products, upload photos, change stock inline. Empty stock = not tracked.
- **Leads:** every enquiry with status (new → contacted → quoted → won/lost) and notes.
- **Social media:** see below.
- **Offers & coupons** and **Team** (owner only).

**Social media automation (Facebook Page + Instagram)**
- **Offers are announced automatically.** Create an offer/coupon with "Announce on Facebook & Instagram" ticked: the AI writes the post, the site makes a branded 1080×1080 image (product photo, % off, code, website) and publishes it within seconds.
- **Regular product posts.** Every day the system keeps the next 7 days filled with the chosen number of product spotlights (default 3 a week at 7 pm IST) and publishes them on time. Each post links back to the product with tracking (`utm_source=social`).
- **Comment replies that sound human.** New comments come in instantly. Questions, praise and buying interest get a short, friendly reply in the commenter's language (English/Hindi/Hinglish), using real prices and links. Complaints, order problems, angry or sensitive comments, and "are you a bot?" are **not** auto-answered – they wait under *Comments that need you* (with an optional Slack/Discord alert). Spam is ignored.
- Everything can be edited, published early, cancelled or paused from **Admin → Social media**. Without an AI key, posts use simple templates and comments wait for the team.

## Running it locally

Needs Node.js 20+ and a Postgres database.

```bash
npm install
cp .env.example .env.local           # fill in DATABASE_URL, AUTH_SECRET, OWNER_EMAIL, OWNER_PASSWORD
npx drizzle-kit push                 # create tables
npm run db:seed                      # load the 43-product catalogue + owner login
npm run dev                          # http://localhost:3000
```

Tests: `tests/e2e.mjs` drives a real browser through the shop, admin and social automation (24 checks) against stand-ins for Meta and the AI (`tests/mock-services.mjs`), so no real accounts are touched.

## Going live (step by step)

### 1. Create the project on Vercel
1. Vercel → **Add New → Project** → import this GitHub repository (framework: Next.js).
2. **Storage → Create → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL`.
3. **Settings → Environment Variables**, add (see `.env.example`):
   - `AUTH_SECRET` – random 64 characters (`openssl rand -hex 32`)
   - `NEXT_PUBLIC_SITE_URL` – `https://spaenterprise.in`
   - `OWNER_EMAIL`, `OWNER_PASSWORD` (10+ characters)
   - `CRON_SECRET` – another random string (Vercel uses it for the daily job)
4. Deploy. Every deploy sets up the database automatically (`vercel-build`): it creates or updates the tables, loads the 43-product catalogue the first time only, and creates/updates the owner login from `OWNER_EMAIL` / `OWNER_PASSWORD`. Existing products and orders are never overwritten; a change that would delete data stops the deploy instead.
5. After deploying, Check the `*.vercel.app` address: browse, place a COD test order, sign in at `/login`.

### 2. Payments (Razorpay)
1. Razorpay → Settings → API Keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
2. Razorpay → Settings → Webhooks → URL `https://spaenterprise.in/api/razorpay/webhook`, events `payment.captured` and `order.paid`, choose a secret → `RAZORPAY_WEBHOOK_SECRET`.
3. `COD_ENABLED=false` turns Cash on Delivery off. Shipping: `SHIPPING_FEE` (default 500), `FREE_SHIPPING_ABOVE` (default 4999).

### 3. Photo uploads
Vercel → Storage → **Blob** → connect to the project (sets `BLOB_READ_WRITE_TOKEN`). Without it, staff paste photo links instead.

### 4. AI writer
`ANTHROPIC_API_KEY` from console.anthropic.com. Uses Claude Opus 5.5 by default (`ANTHROPIC_MODEL` to change), at low effort to keep costs small.

### 5. Connect Facebook & Instagram
You need a Facebook Page and an Instagram **Business/Creator** account linked to that Page.
1. developers.facebook.com → **Create app** (type *Business*). Add the products **Facebook Login for Business**, **Webhooks** and **Instagram**.
2. In **Graph API Explorer**, select the app, get a *User token* with: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `pages_manage_metadata`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `business_management`.
3. Exchange it for a long-lived token (Access Token Debugger → *Extend*), then call `GET /me/accounts`: the Page's `access_token` there doesn't expire → `META_PAGE_ACCESS_TOKEN`, its `id` → `META_PAGE_ID`.
4. `GET /{page-id}?fields=instagram_business_account` → `META_IG_USER_ID`.
5. App settings → Basic → **App secret** → `META_APP_SECRET`. Choose any random `META_WEBHOOK_VERIFY_TOKEN`.
6. Webhooks: callback URL `https://spaenterprise.in/api/meta/webhook` with that verify token. Subscribe **Page → feed** and **Instagram → comments**. Then subscribe the Page: `POST /{page-id}/subscribed_apps?subscribed_fields=feed` (with the Page token).
7. Switch the app to **Live** (privacy policy URL: `https://spaenterprise.in/policies#privacy`). Meta may ask for App Review for some permissions.
8. Admin → Social media should now show every connection ticked. Create a test offer to see the first post go out.

Optional: `NOTIFY_WEBHOOK_URL` (Slack or Discord incoming webhook) pings the team for every order, lead, failed post and comment that needs a person.

### 6. Move spaenterprise.in to the new site
Do this only after steps 1–2 work on the `*.vercel.app` address.
1. Old Vercel project → Settings → **Domains** → remove `spaenterprise.in` and `www.spaenterprise.in`.
2. New project → Settings → **Domains** → add both. If the domain's DNS already points at Vercel, it switches within minutes; otherwise Vercel shows the records to set at your registrar.
3. Update the Razorpay and Meta webhook URLs if you tested with the `vercel.app` address.
4. The old Railway backend is no longer needed once you've confirmed the new site works.

### Daily job
`vercel.json` runs `/api/cron/marketing` once a day at 13:00 UTC (6:30 pm IST); posts due within the hour go out then, and offer posts go out immediately when saved. On the Vercel Pro plan you can make it hourly (`0 * * * *`) to follow a different posting time exactly.

## Project layout
- `src/app/(store)` – shop pages; `src/app/admin` – admin; `src/app/api` – Razorpay & Meta webhooks, cron, social image
- `src/lib/orders.ts` – pricing, stock reservation, payment confirmation
- `src/lib/marketing.ts` – post writing, scheduling, publishing, comment replies
- `src/lib/meta.ts` – Facebook/Instagram Graph API; `src/lib/ai.ts` – Claude
- `src/db/schema.ts` – database tables; `scripts/seed.ts` – starting catalogue

Built and maintained for SPA Enterprises by [Paravion Tech](https://portfolio-a6ccb.web.app/).
