-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('REQUESTED', 'APPROVED');
  CREATE TYPE public.expense_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_shadow BOOLEAN NOT NULL DEFAULT FALSE,
  guardian_id uuid REFERENCES public.profiles(id)
);

-- 3. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTION (Fixes the Infinite Loop)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PROFILES POLICIES
DO $$ BEGIN
  CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view relevant profiles" ON public.profiles
  FOR SELECT USING (
    auth_id = auth.uid() OR 
    id = auth.uid() OR
    guardian_id = (SELECT id FROM public.profiles WHERE auth_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage groups" ON public.groups FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.user_status NOT NULL DEFAULT 'REQUESTED',
  UNIQUE (group_id, profile_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members view groups" ON public.groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.groups.id AND gm.profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage members" ON public.group_members FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users view group members" ON public.group_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members my_gm 
      WHERE my_gm.group_id = public.group_members.group_id 
      AND my_gm.profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users request to join" ON public.group_members FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status public.expense_status NOT NULL DEFAULT 'PENDING'
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Group members view expenses" ON public.expenses FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.expenses.group_id AND gm.profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users create expenses" ON public.expenses FOR INSERT WITH CHECK (
    payer_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
  consumer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  responsible_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_owed NUMERIC(10, 2) NOT NULL
);
