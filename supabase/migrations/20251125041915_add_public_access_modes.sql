/*
  # Add Public Access Modes to Lists

  ## Overview
  This migration adds a public_access_mode field to the lists table to support
  three distinct sharing modes: none, members, and anyone.

  ## Modified Tables
    - `lists` - Add public_access_mode field

  ## Access Modes
    - **none**: No public access (default, private list)
    - **members**: Any authenticated user can access with view rights
    - **anyone**: Anyone with the link can view and interact

  ## Important Notes
    - Replace the old is_public boolean with the new access mode system
    - Update default value to 'none' for security
    - Existing public lists will be migrated to 'anyone' mode
    - Existing private lists will be migrated to 'none' mode
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'public_access_mode'
  ) THEN
    ALTER TABLE lists ADD COLUMN public_access_mode text DEFAULT 'none' NOT NULL
      CHECK (public_access_mode IN ('none', 'members', 'anyone'));
  END IF;
END $$;

UPDATE lists
SET public_access_mode = CASE 
  WHEN is_public = true THEN 'anyone'
  ELSE 'none'
END
WHERE public_access_mode = 'none';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE lists DROP COLUMN is_public;
  END IF;
END $$;
