-- Run this in Supabase SQL Editor to enable username availability checking

-- Function to check if a username is available
CREATE OR REPLACE FUNCTION check_username_available(uname TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = LOWER(uname)
  );
$$;

-- Grant usage to anon and authenticated roles
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon, authenticated;
