# Figure Atlas — Deployment Guide

**Stack:** Next.js · Vercel · Stripe · Supabase

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → create a new project.
2. Open the **SQL Editor** and paste the contents of `supabase/schema.sql`. Run it.
3. Copy your project URL and **service_role** secret key from  
   **Settings → API** — you'll need them in step 4.

---

## 3. Set up Stripe

1. Create an account at [stripe.com](https://stripe.com).
2. From the Stripe dashboard, copy your **Publishable key** and **Secret key**  
   (use `sk_test_` / `pk_test_` keys for local testing).
3. Enable Apple Pay:  
   **Dashboard → Settings → Payment methods → Apple Pay → Add domain**  
   Stripe auto-hosts the domain verification file — nothing else needed.

---

## 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your real keys:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## 5. Run locally

```bash
npm run dev
```

App is at `http://localhost:3000`.

> **Apple Pay on localhost:** Apple Pay only fires on HTTPS. Use Stripe's  
> test card `4242 4242 4242 4242` (any expiry/CVC) to test card payments locally.  
> For the real Apple Pay sheet, deploy a Vercel preview and test there.

Forward Stripe webhooks (optional, for future webhook use):

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

---

## 6. Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "initial"
gh repo create figure-atlas --public --push

# Deploy
npx vercel
```

In the **Vercel dashboard → your project → Settings → Environment Variables**,  
add the same four keys from your `.env.local`:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJ...` |

Redeploy after adding variables: **Vercel dashboard → Deployments → Redeploy**.

---

## 7. Add your custom domain (for Instagram link)

1. Vercel dashboard → your project → **Settings → Domains** → add your domain.
2. Update your DNS records as instructed (usually a CNAME or A record).
3. Once verified, share `https://yourdomain.com` in your Instagram bio/stories.

> Instagram strips query strings from link-in-bio clicks on some clients.  
> The base URL `https://yourdomain.com` always loads the quiz correctly.

---

## Architecture overview

```
/                   ← middleware rewrites to public/app.html
/app.html           ← full quiz UI (vanilla JS + Stripe.js + Chart.js)
/api/config         ← returns Stripe publishable key
/api/create-payment ← creates Stripe PaymentIntent ($1.99)
/api/confirm-payment← verifies payment, generates & stores FA-XXXX-XXXX key
/api/verify-key     ← checks key against Supabase, marks it used
```

## Cost at launch

| Service | Cost |
|---|---|
| Vercel | Free (Hobby tier) |
| Supabase | Free (up to 50k rows) |
| Stripe | 2.9% + $0.30 per transaction (~$0.36 on $1.99) |
| Domain | ~$12/year |
