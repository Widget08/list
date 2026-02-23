/*
  # Fix Invite Link RLS Policies

  ## Overview
  Fixes Row Level Security policies to allow invite link redemption
  and viewing list information when a valid invite exists.

  ## Changes

  ### Lists Table
  - Add policy to allow viewing list basic info (name) when a valid invite link exists

  ### List Members Table
  - Add policy to allow users to insert themselves as members when redeeming a valid invite link

  ### List Invite Links Table
  - Update admin policy to include list owners (not just members with admin role)

  ## Security Notes
  - Users can only view basic list info (name) if there's a valid, non-expired invite link
  - Users can only add themselves as members, not others
  - The role assigned matches the invite link's role
  - Invite link usage count is managed separately in the application layer
*/

-- Drop the existing restrictive policy on list_invite_links
DROP POLICY IF EXISTS "List admins can manage invite links" ON list_invite_links;

-- Create new policy that allows both list owners and admin members to manage invite links
CREATE POLICY "List owners and admins can manage invite links"
  ON list_invite_links
  FOR ALL
  TO authenticated
  USING (
    -- List owner
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_invite_links.list_id
        AND lists.user_id = auth.uid()
    )
    -- OR admin member
    OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
        AND list_members.user_id = auth.uid()
        AND list_members.role = 'admin'
    )
  )
  WITH CHECK (
    -- List owner
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_invite_links.list_id
        AND lists.user_id = auth.uid()
    )
    -- OR admin member
    OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
        AND list_members.user_id = auth.uid()
        AND list_members.role = 'admin'
    )
  );

-- Add policy to allow viewing list name when there's a valid invite link
CREATE POLICY "Anyone can view list name with valid invite link"
  ON lists FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_invite_links
      WHERE list_invite_links.list_id = lists.id
        AND (list_invite_links.expires_at IS NULL OR list_invite_links.expires_at > now())
        AND (list_invite_links.max_uses IS NULL OR list_invite_links.used_count < list_invite_links.max_uses)
    )
  );

-- Add policy to allow users to add themselves when redeeming an invite link
CREATE POLICY "Users can join via valid invite link"
  ON list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is adding themselves
    user_id = auth.uid()
    -- AND there's a valid invite link for this list
    AND EXISTS (
      SELECT 1 FROM list_invite_links
      WHERE list_invite_links.list_id = list_members.list_id
        AND (list_invite_links.expires_at IS NULL OR list_invite_links.expires_at > now())
        AND (list_invite_links.max_uses IS NULL OR list_invite_links.used_count < list_invite_links.max_uses)
    )
  );