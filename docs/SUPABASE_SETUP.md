# Supabase Setup Guide for Afrimart POS

This document provides instructions for manually provisioning and configuring your Supabase project for the Afrimart Supermarket POS SaaS platform.

---

## 1. Create a Supabase Project

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose an organization, provide a project name (e.g. `afrimart-pos-production`), set a database password, and select your preferred region (e.g., `West Africa` or closest latency zone).
4. Wait for provisioning to complete (~1-2 minutes).

---

## 2. Apply Database Migrations & RLS Policies

1. In your Supabase project dashboard, navigate to the **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file located in this repository at:
   `supabase/migrations/20261018000001_initial_supermarket_pos_schema.sql`
4. Copy the entire contents of this file, paste it into the Supabase SQL Editor, and click **Run**.
5. Verify that all 21 tables, foreign key constraints, indexes, and Row Level Security policies were created without errors.

---

## 3. Configure Supabase Storage Buckets

1. In the Supabase left navigation, click **Storage**.
2. Click **New bucket** and create:
   - **Bucket Name**: `product-images`
   - **Public bucket**: Checked (to allow cashiers and customer displays to render product photographs via secure CDN URLs)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`
   - **Max file size**: `5MB`
3. Click **New bucket** and create:
   - **Bucket Name**: `store-assets`
   - **Public bucket**: Checked (for supermarket logos and receipt header graphics)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`
   - **Max file size**: `2MB`

---

## 4. Enable Supabase Realtime

For live updates between the Cashier terminal and the Customer-Facing Display:

1. In Supabase, navigate to **Database** → **Replication**.
2. Find the `customer_display_sessions` table and toggle **Source** to enabled.
3. Find the `sales` table and toggle **Source** to enabled.

---

## 5. Retrieve Environment API Keys

1. In your Supabase Dashboard, click **Project Settings** (gear icon) → **API**.
2. Copy:
   - **Project URL** → Set as `VITE_SUPABASE_URL` in your `.env`
   - **Project API Keys `anon public`** → Set as `VITE_SUPABASE_ANON_KEY` in your `.env`
   - **Project API Keys `service_role secret`** → Set as `SUPABASE_SERVICE_ROLE_KEY` in your server environment (never in client bundles!)
