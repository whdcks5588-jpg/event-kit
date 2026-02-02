-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow admin to manage users" ON public.users;

-- Create new policies without recursion
-- 1. Allow anyone to read users (needed for the custom login logic)
CREATE POLICY "Enable read access for all users" ON public.users
FOR SELECT USING (true);

-- 2. Allow anyone to insert users (needed for creating temp accounts from the client side)
-- Note: In a production app, this should be restricted, but for this custom auth prototype, 
-- it's necessary to allow the dashboard to create new users using the anon key.
CREATE POLICY "Enable insert access for all users" ON public.users
FOR INSERT WITH CHECK (true);

-- 3. Allow all other operations for now to ensure functionality
CREATE POLICY "Enable update/delete for all users" ON public.users
FOR ALL USING (true);
