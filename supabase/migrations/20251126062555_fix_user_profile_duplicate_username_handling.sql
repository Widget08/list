/*
  # Fix User Profile Username Conflict Handling

  ## Overview
  Updates the user profile creation trigger to handle username conflicts
  by appending a unique suffix when a username is already taken.

  ## Changes
    - Update create_user_profile function to handle duplicate usernames
    - Generate unique username by appending random suffix if conflict occurs
    - Ensure all existing users without profiles get created

  ## Important Notes
    - Usernames must be unique across the system
    - If the default username (email prefix) is taken, append a random suffix
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;

-- Recreate function with username conflict handling
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  base_username text;
  final_username text;
  username_exists boolean;
  attempt_count int := 0;
BEGIN
  -- Get base username from email
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  final_username := base_username;
  
  -- Check if username exists and generate unique one if needed
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE username = final_username) INTO username_exists;
    
    IF NOT username_exists THEN
      EXIT;
    END IF;
    
    -- Generate new username with random suffix
    attempt_count := attempt_count + 1;
    final_username := base_username || '_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 6);
    
    -- Safety check to prevent infinite loop
    IF attempt_count > 100 THEN
      final_username := base_username || '_' || NEW.id::text;
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert the profile
  INSERT INTO public.user_profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    final_username
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO postgres;

-- Recreate the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- Create profiles for any existing users that don't have one
DO $$
DECLARE
  user_record RECORD;
  base_username text;
  final_username text;
  username_exists boolean;
  attempt_count int;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
    )
  LOOP
    base_username := COALESCE(user_record.raw_user_meta_data->>'username', split_part(user_record.email, '@', 1));
    final_username := base_username;
    attempt_count := 0;
    
    -- Find unique username
    LOOP
      SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE username = final_username) INTO username_exists;
      
      IF NOT username_exists THEN
        EXIT;
      END IF;
      
      attempt_count := attempt_count + 1;
      final_username := base_username || '_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 6);
      
      IF attempt_count > 100 THEN
        final_username := base_username || '_' || user_record.id::text;
        EXIT;
      END IF;
    END LOOP;
    
    -- Insert profile
    INSERT INTO public.user_profiles (id, email, username)
    VALUES (user_record.id, user_record.email, final_username)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
