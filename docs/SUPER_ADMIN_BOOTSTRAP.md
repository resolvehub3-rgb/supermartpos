# Super Admin Bootstrap Instructions

To adhere to strict zero-trust security standards, the platform Super Admin account cannot be created via public registration. It must be provisioned through a trusted administrative bootstrap procedure.

---

## Method 1: SQL Editor Bootstrap (Recommended)

After applying the migration `20261018000001_initial_supermarket_pos_schema.sql`:

1. In the Supabase Dashboard, go to **Authentication** → **Users** → **Add User** (or use `Invite user` / `Create user`).
2. Enter the Super Admin's email (e.g., `admin@afrimart.com`) and choose a strong password. Note down the generated UUID for this user.
3. Open the **SQL Editor** in Supabase and run the following script:

```sql
-- Replace with the actual email and UUID created in Supabase Auth
DO $$
DECLARE
  v_user_id UUID := 'YOUR-SUPABASE-AUTH-USER-UUID';
  v_email TEXT := 'admin@afrimart.com';
  v_name TEXT := 'Platform Super Administrator';
BEGIN
  -- 1. Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (v_user_id, v_email, v_name)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  -- 2. Grant super_admin platform role
  INSERT INTO public.platform_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Super Admin successfully provisioned for % (%)', v_name, v_email;
END $$;
```

4. Sign in at `http://localhost:3000/login` with `admin@afrimart.com` and password.
5. The system will detect your `super_admin` role in `platform_roles` and grant immediate access to `/super-admin`.
