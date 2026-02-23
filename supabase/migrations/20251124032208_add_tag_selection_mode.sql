/*
  # Add Tag Selection Mode

  1. Changes
    - Add `allow_multiple_tags` field to `list_settings` table
      - Boolean field to control whether users can select one or multiple tags per item
      - Defaults to false (single tag selection)
  
  2. Notes
    - This allows list owners to configure whether items can have one tag or multiple tags
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_settings' AND column_name = 'allow_multiple_tags'
  ) THEN
    ALTER TABLE list_settings ADD COLUMN allow_multiple_tags boolean DEFAULT false NOT NULL;
  END IF;
END $$;