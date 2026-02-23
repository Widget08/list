/*
  # Update RLS Policies for Role-Based Access Control

  ## Overview
  This migration updates all RLS policies to support the new role-based access
  control system with 'view', 'edit', and 'admin' roles.

  ## Access Control Rules
    - **admin**: Can view, edit, and manage list settings and members
    - **edit**: Can view and edit list items, but cannot access settings
    - **view**: Can only view the list and interact with voting/rating/comments

  ## Security Changes
    - Update lists policies to check list_members table
    - Update list_items policies to check member permissions
    - Update list_settings policies to check for admin role
    - Update other feature policies to check for appropriate permissions

  ## Important Notes
    - All policies are restrictive by default
    - Users must be authenticated
    - Ownership checks are enforced through list_members table
*/

DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;

CREATE POLICY "Users can view lists they have access to"
  ON lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "List admins can update lists"
  ON lists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
      AND list_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
      AND list_members.role = 'admin'
    )
  );

CREATE POLICY "List admins can delete lists"
  ON lists FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
      AND list_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view items from own lists" ON list_items;
DROP POLICY IF EXISTS "Users can insert items to own lists" ON list_items;
DROP POLICY IF EXISTS "Users can update items in own lists" ON list_items;
DROP POLICY IF EXISTS "Users can delete items from own lists" ON list_items;

CREATE POLICY "List members can view items"
  ON list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "List editors and admins can insert items"
  ON list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('edit', 'admin')
    )
  );

CREATE POLICY "List editors and admins can update items"
  ON list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('edit', 'admin')
    )
  );

CREATE POLICY "List editors and admins can delete items"
  ON list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('edit', 'admin')
    )
  );

DROP POLICY IF EXISTS "List owners can manage settings" ON list_settings;
DROP POLICY IF EXISTS "List members can view settings" ON list_settings;

CREATE POLICY "List admins can manage settings"
  ON list_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_settings.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role = 'admin'
    )
  );

CREATE POLICY "List members can view settings"
  ON list_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_settings.list_id
      AND list_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "List owners can manage statuses" ON list_statuses;
DROP POLICY IF EXISTS "List members can view statuses" ON list_statuses;

CREATE POLICY "List admins can manage statuses"
  ON list_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_statuses.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role = 'admin'
    )
  );

CREATE POLICY "List members can view statuses"
  ON list_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_statuses.list_id
      AND list_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "List owners can manage members" ON list_members;
DROP POLICY IF EXISTS "List members can view members" ON list_members;

CREATE POLICY "List admins can manage members"
  ON list_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = list_members.list_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
  );

CREATE POLICY "List members can view other members"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = list_members.list_id
      AND lm.user_id = auth.uid()
    )
  );
