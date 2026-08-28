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
    CREATE TYPE booking_status_enum AS ENUM ('pending', 'verified', 'declined', 'active');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'gate');
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
  pass_type pass_type_enum NOT NULL,
  category booking_category_enum NOT NULL DEFAULT 'single',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  utr TEXT,
  screenshot_path TEXT,
  purchase_id TEXT NOT NULL DEFAULT ('RAU-' || upper(substring(md5(random()::text) from 1 for 6))),
  status booking_status_enum NOT NULL DEFAULT 'pending',
  coupon_code TEXT,
  discount_percent INT DEFAULT 0,
  final_amount INT NOT NULL,
  ticket_token TEXT UNIQUE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  role user_role_enum NOT NULL,
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

-- Security definer role check function
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, required_role user_role_enum)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DB Trigger to auto-mint 24-character cryptographic ticket token when booking flips to verified
CREATE OR REPLACE FUNCTION public.mint_ticket_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND (NEW.ticket_token IS NULL OR NEW.ticket_token = '') THEN
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
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bookings Policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gate'));

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
CREATE POLICY "Users can insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending bookings" ON public.bookings;
CREATE POLICY "Users can update own pending bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- User Roles Policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Coupons Policies
DROP POLICY IF EXISTS "Anyone can view coupons" ON public.coupons;
CREATE POLICY "Anyone can view coupons" ON public.coupons
  FOR SELECT USING (true);

-- Admin Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ========================================================
-- STORAGE BUCKET CONFIGURATION
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own screenshot" ON storage.objects;
CREATE POLICY "Users can upload own screenshot" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own screenshot" ON storage.objects;
CREATE POLICY "Users can view own screenshot" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
