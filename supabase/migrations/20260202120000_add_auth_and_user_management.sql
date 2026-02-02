-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add created_by and created_by_username to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS created_by_username TEXT;

-- Insert root user (password is 'root1234')
INSERT INTO public.users (username, password, role)
VALUES ('root', 'root1234', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read users (needed for login check)
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);

-- Allow admin to manage users
DROP POLICY IF EXISTS "Allow admin to manage users" ON public.users;
CREATE POLICY "Allow admin to manage users" ON public.users FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Grant access to anon and authenticated roles
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
