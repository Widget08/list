/*
  # Add List Invite Links

  1. New Tables
    - `list_invite_links`
      - `id` (uuid, primary key)
      - `list_id` (uuid, references lists)
      - `created_by` (uuid, references auth.users)
      - `role` (text, the role granted by this invite link)
      - `token` (text, unique token for the invite link)
      - `expires_at` (timestamptz, optional expiration)
      - `max_uses` (integer, optional max number of uses)
      - `used_count` (integer, number of times used)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
  2. Security
    - Enable RLS on `list_invite_links` table
    - Add policies for list admins to manage invite links
    - Add policy for anonymous users to view invite link details (for redemption)
*/

CREATE TABLE IF NOT EXISTS list_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('view', 'edit', 'admin')),
  token text NOT NULL UNIQUE DEFAULT substring(md5(random()::text || clock_timestamp()::text) from 1 for 32),
  expires_at timestamptz,
  max_uses integer,
  used_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE list_invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "List admins can manage invite links"
  ON list_invite_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
        AND list_members.user_id = auth.uid()
        AND list_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
        AND list_members.user_id = auth.uid()
        AND list_members.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view invite link details for redemption"
  ON list_invite_links
  FOR SELECT
  TO anon, authenticated
  USING (
    (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses)
  );

CREATE INDEX IF NOT EXISTS idx_list_invite_links_token ON list_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_list_invite_links_list_id ON list_invite_links(list_id);
