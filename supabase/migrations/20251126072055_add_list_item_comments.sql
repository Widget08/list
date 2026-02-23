/*
  # Add List Item Comments Feature

  1. New Tables
    - `list_item_comments`
      - `id` (uuid, primary key)
      - `list_item_id` (uuid, foreign key to list_items)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `list_item_comments` table
    - Add policy for authenticated users to read comments on lists they can access
    - Add policy for authenticated users to create comments on lists they can access
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments
*/

CREATE TABLE IF NOT EXISTS list_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_item_id uuid NOT NULL REFERENCES list_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE list_item_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read comments on accessible lists"
  ON list_item_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items li
      JOIN lists l ON li.list_id = l.id
      WHERE li.id = list_item_id
      AND (
        l.user_id = auth.uid()
        OR l.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members lm
          WHERE lm.list_id = l.id
          AND lm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create comments on accessible lists"
  ON list_item_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM list_items li
      JOIN lists l ON li.list_id = l.id
      WHERE li.id = list_item_id
      AND (
        l.user_id = auth.uid()
        OR l.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members lm
          WHERE lm.list_id = l.id
          AND lm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON list_item_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON list_item_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_list_item_comments_list_item_id ON list_item_comments(list_item_id);
CREATE INDEX IF NOT EXISTS idx_list_item_comments_user_id ON list_item_comments(user_id);