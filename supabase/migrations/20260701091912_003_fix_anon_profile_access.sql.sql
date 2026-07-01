-- Drop existing anon profile policy and create a better one
DROP POLICY IF EXISTS "select_profile_by_email" ON profiles;

-- Allow anon to read profiles for login lookup (by email or to check if setup needed)
CREATE POLICY "anon_read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

-- Allow authenticated users to read all profiles (for admin/guru operations)
CREATE POLICY "authenticated_read_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Drop the restrictive select_own_profile since we have a broader one now
DROP POLICY IF EXISTS "select_own_profile" ON profiles;