/*
  # Add User Profiles and Update List Member Roles

  ## Overview
  This migration adds user profile support and updates the list member roles
  to match the requirements (view, edit, admin).

  ## New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - References auth.users
      - `username` (text, unique) - User's display name
      - `email` (text) - User's email (for search)
      - `created_at` (timestamptz) - When profile was created
      - `updated_at` (timestamptz) - When profile was last updated

  ## Modified Tables
    - `list_members` - Update role constraint to use 'view', 'edit', 'admin'

  ## Security
    - RLS enabled on user_profiles
    - Users can view all profiles (for search)
    - Users can only update their own profile
    - Automatically create profile on user signup

  ## Important Notes
    - The 'admin' role can view, edit, and update list settings
    - The 'edit' role can view and edit the list, but cannot access settings
    - The 'view' role can only view the list and use voting/rating/comments features
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON user_profiles(username);
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles(email);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'list_members_role_check'
    AND table_name = 'list_members'
  ) THEN
    ALTER TABLE list_members DROP CONSTRAINT list_members_role_check;
  END IF;
END $$;

ALTER TABLE list_members ADD CONSTRAINT list_members_role_check
  CHECK (role IN ('view', 'edit', 'admin'));

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

CREATE OR REPLACE FUNCTION create_list_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO list_members (list_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'admin', NEW.user_id)
  ON CONFLICT (list_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_list_owner_member_trigger ON lists;
CREATE TRIGGER create_list_owner_member_trigger
  AFTER INSERT ON lists
  FOR EACH ROW
  EXECUTE FUNCTION create_list_owner_member();
