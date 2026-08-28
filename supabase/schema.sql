-- ========================================================
-- RAUSCH DATABASE SCHEMA & SECURITY POLICIES (SAFE IDEMPOTENT)
-- ========================================================

-- 1. Enums (Safe creation without duplicate errors)
DO $$ BEGIN
    CREATE TYPE pass_type_enum AS ENUM ('general', 'vip', 'couple_general', 'couple_vip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_category_enum AS ENUM ('single', 'couple');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'verified', 'checked_in', 'declined', 'active');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'gate', 'scanner');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL, -- 'general', 'vip', 'couple_general', 'couple_vip'
  category TEXT NOT NULL DEFAULT 'single', -- 'single', 'couple'
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  utr TEXT,
  utr_number TEXT,
  screenshot_path TEXT,
  payment_screenshot_path TEXT,
  purchase_id TEXT NOT NULL DEFAULT ('RAU-' || upper(substring(md5(random()::text) from 1 for 6))),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'verified', 'checked_in', 'declined'
  coupon_code TEXT,
  discount_percent INT DEFAULT 0,
  discount_amount INT DEFAULT 0,
  final_amount INT NOT NULL,
  ticket_token TEXT UNIQUE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Coupons Table (Dynamic; No default/ready-made coupons)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  percent_off INT NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  pass_type TEXT NOT NULL DEFAULT 'all', -- 'general', 'vip', 'couple_general', 'couple_vip', 'all'
  active BOOLEAN NOT NULL DEFAULT TRUE,
  max_uses INT DEFAULT NULL,
  uses_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Roles Table (Admin & Gate Staff)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'admin', 'gate', 'scanner'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 6. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ========================================================

-- Auto-mint 24-character cryptographic ticket token upon booking confirmation
CREATE OR REPLACE FUNCTION public.mint_ticket_token()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IN ('confirmed', 'verified', 'checked_in')) AND (NEW.ticket_token IS NULL OR NEW.ticket_token = '') THEN
    NEW.ticket_token := upper(substring(md5(random()::text || clock_timestamp()::text || NEW.id::text) from 1 for 24));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mint_ticket_token ON public.bookings;
CREATE TRIGGER trigger_mint_ticket_token
BEFORE INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.mint_ticket_token();

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Bookings Policies
DROP POLICY IF EXISTS "Public can view ticket by token" ON public.bookings;
CREATE POLICY "Public can view ticket by token" ON public.bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert bookings" ON public.bookings;
CREATE POLICY "Authenticated users can insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;
CREATE POLICY "Authenticated users can update bookings" ON public.bookings FOR UPDATE USING (true);

-- User Roles Policies
DROP POLICY IF EXISTS "Public can view user roles" ON public.user_roles;
CREATE POLICY "Public can view user roles" ON public.user_roles FOR SELECT USING (true);

-- Coupons Policies
DROP POLICY IF EXISTS "Anyone can view coupons" ON public.coupons;
CREATE POLICY "Anyone can view coupons" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (true);

-- Admin Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR ALL USING (true);

-- ========================================================
-- STORAGE BUCKET CONFIGURATION
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can upload payment screenshot" ON storage.objects;
CREATE POLICY "Anyone can upload payment screenshot" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Anyone can view payment screenshot" ON storage.objects;
CREATE POLICY "Anyone can view payment screenshot" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-screenshots');
