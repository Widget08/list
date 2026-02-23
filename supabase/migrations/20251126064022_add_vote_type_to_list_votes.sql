/*
  # Add Vote Type to List Votes

  ## Overview
  Updates the list_votes table to track both upvotes and downvotes,
  ensuring each user can only vote once per item (either up or down).

  ## Changes
    - Add vote_type column to list_votes (1 for upvote, -1 for downvote)
    - Update unique constraint to allow one vote per user per item
    - Migrate existing votes to be upvotes (vote_type = 1)

  ## Important Notes
    - Each user can have exactly one vote (up or down) per list item
    - Changing vote type will update the existing vote record
    - Vote counts are calculated by summing vote_type values
*/

-- Add vote_type column (1 for upvote, -1 for downvote)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_votes' AND column_name = 'vote_type'
  ) THEN
    ALTER TABLE list_votes ADD COLUMN vote_type integer NOT NULL DEFAULT 1;
    ALTER TABLE list_votes ADD CONSTRAINT vote_type_check CHECK (vote_type IN (1, -1));
  END IF;
END $$;

-- Update all existing votes to be upvotes
UPDATE list_votes SET vote_type = 1 WHERE vote_type IS NULL OR vote_type = 0;

-- Ensure there's a unique constraint on user_id and list_item_id
-- Drop any existing constraint first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'list_votes_user_item_unique'
    AND table_name = 'list_votes'
  ) THEN
    ALTER TABLE list_votes DROP CONSTRAINT list_votes_user_item_unique;
  END IF;
END $$;

-- Create unique constraint to ensure one vote per user per item
ALTER TABLE list_votes ADD CONSTRAINT list_votes_user_item_unique 
  UNIQUE (list_item_id, user_id);

-- Create index for efficient vote lookups
CREATE INDEX IF NOT EXISTS idx_list_votes_item_user ON list_votes(list_item_id, user_id);
