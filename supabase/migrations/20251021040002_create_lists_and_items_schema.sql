/*
  # Lists Application Schema

  ## Overview
  This migration creates the database schema for a lists application that allows users to create lists and track items within those lists.

  ## New Tables
  
  ### `lists`
  Stores user-created lists
  - `id` (uuid, primary key) - Unique identifier for each list
  - `user_id` (uuid, foreign key) - References auth.users, the owner of the list
  - `name` (text, required) - Name of the list
  - `description` (text, optional) - Optional description for the list
  - `created_at` (timestamptz) - Timestamp when list was created
  - `updated_at` (timestamptz) - Timestamp when list was last updated
  
  ### `list_items`
  Stores items within lists
  - `id` (uuid, primary key) - Unique identifier for each item
  - `list_id` (uuid, foreign key) - References lists table
  - `user_id` (uuid, foreign key) - References auth.users, the owner of the item
  - `title` (text, required) - Title/name of the item
  - `description` (text, optional) - Optional description for the item
  - `completed` (boolean) - Whether the item is completed or not
  - `position` (integer) - Ordering position within the list
  - `created_at` (timestamptz) - Timestamp when item was created
  - `updated_at` (timestamptz) - Timestamp when item was last updated

  ## Security (Row Level Security)
  
  ### Lists Table
  - RLS enabled to protect user data
  - Users can only view their own lists
  - Users can insert their own lists
  - Users can update their own lists
  - Users can delete their own lists
  
  ### List Items Table
  - RLS enabled to protect user data
  - Users can only view items from their own lists
  - Users can insert items to their own lists
  - Users can update items in their own lists
  - Users can delete items from their own lists

  ## Indexes
  - Index on `lists.user_id` for efficient list queries by user
  - Index on `list_items.list_id` for efficient item queries by list
  - Index on `list_items.user_id` for efficient item queries by user
*/

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  completed boolean DEFAULT false NOT NULL,
  position integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lists"
  ON lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view items from own lists"
  ON list_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert items to own lists"
  ON list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own lists"
  ON list_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own lists"
  ON list_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS lists_user_id_idx ON lists(user_id);
CREATE INDEX IF NOT EXISTS list_items_list_id_idx ON list_items(list_id);
CREATE INDEX IF NOT EXISTS list_items_user_id_idx ON list_items(user_id);
