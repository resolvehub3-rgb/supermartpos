# Vercel Deployment Instructions for Afrimart POS

This guide outlines how to deploy the Afrimart Multi-Tenant Supermarket POS SaaS platform to Vercel with real Supabase PostgreSQL integration.

---

## 1. Prerequisites

- A Git repository (GitHub / GitLab / Bitbucket) containing this codebase.
- A Supabase project with migration `supabase/migrations/20261018000001_initial_supermarket_pos_schema.sql` executed.
- A Vercel account.

---

## 2. Connect Repository to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your Git repository.
4. Framework Preset: **Vite** (Build Command: `npm run build`, Output Directory: `dist`).

---

## 3. Configure Environment Variables in Vercel

Under **Project Settings** → **Environment Variables**, add:

| Variable | Description | Exposure |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://your-ref.supabase.co`) | Public / Browser |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public API key | Public / Browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged secret key for administrative server tasks | Secret / Server Only |
| `VITE_APP_URL` | Production URL (e.g. `https://pos.yourdomain.com`) | Public / Browser |
| `SMTP_HOST` | `smtp.gmail.com` | Secret / Server Only |
| `SMTP_PORT` | `587` | Secret / Server Only |
| `SMTP_USER` | Transactional email sender address | Secret / Server Only |
| `SMTP_PASSWORD` | 16-character Google App Password | Secret / Server Only |
| `SMTP_FROM_EMAIL` | Transactional email sender address | Secret / Server Only |
| `SMTP_FROM_NAME` | `Afrimart POS Cloud` | Secret / Server Only |
| `PAYMENT_PROVIDER_SECRET_KEY` | Live secret key from payment gateway | Secret / Server Only |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | Signature verification secret for billing webhooks | Secret / Server Only |

---

## 4. Deploy and Verify

1. Click **Deploy**. Vercel will build the frontend bundle and serve the app across its global edge network.
2. Visit your assigned production domain.
3. Verify that the **Database Setup Required** banner is absent once real Supabase environment variables are connected.
4. Execute the Super Admin bootstrap SQL script (`docs/SUPER_ADMIN_BOOTSTRAP.md`) to create your first platform administrator.
