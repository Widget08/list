/*
  # Fix User Profile Creation Trigger

  ## Overview
  Fixes the user profile creation by ensuring the trigger function has proper permissions
  and handles the auth schema correctly.

  ## Changes
    - Recreate the trigger function with proper permissions
    - Ensure the function can access both auth and public schemas
    - Add error handling to the trigger

  ## Important Notes
    - The function needs SECURITY DEFINER to write to public.user_profiles
    - The trigger fires on auth.users INSERT
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

-- Recreate function with proper permissions and error handling
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO postgres;

-- Recreate the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- Create profiles for any existing users that don't have one
INSERT INTO public.user_profiles (id, email, username)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
