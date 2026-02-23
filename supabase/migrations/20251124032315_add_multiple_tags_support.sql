/*
  # Add Multiple Tags Support

  1. Changes
    - Add `tags` field to `list_items` table as a text array
      - This allows items to have multiple tags
      - Defaults to empty array
    - Keep existing `status` field for backward compatibility
      - Future code will gradually migrate to use `tags` field
  
  2. Notes
    - The `tags` field will store an array of tag names
    - When `allow_multiple_tags` is false, the array will have at most one element
    - When `allow_multiple_tags` is true, the array can have multiple elements
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'tags'
  ) THEN
    ALTER TABLE list_items ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;