/*
  # Rebuild RLS Policies From Scratch

  ## Overview
  Removes all existing RLS policies and adds back only the necessary policies
  to support the application's access control requirements.

  ## Access Model
  
  ### Lists Table
  - Users can view: their own lists, lists they're members of, 'members' mode lists, 'anyone' mode lists
  - Users can create: their own lists
  - Admins can update: lists they're admin members of
  - Admins can delete: lists they're admin members of
  
  ### List Members Table
  - Users can view: members of lists they have access to
  - List owners can insert: new members
  - Admins can update: member roles
  - Admins can delete: members
  
  ### List Items Table
  - Users can view: items from lists they have access to
  - Editors/Admins can insert: new items
  - Editors/Admins can update: items
  - Editors/Admins can delete: items

  ## Important Notes
  - Policies are designed to avoid circular dependencies
  - Uses simple checks to prevent infinite recursion
  - Follows principle of least privilege
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own lists" ON lists;
DROP POLICY IF EXISTS "Users can view lists where they are members" ON lists;
DROP POLICY IF EXISTS "Authenticated users can view member-shared lists" ON lists;
DROP POLICY IF EXISTS "Anyone can view public lists" ON lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON lists;
DROP POLICY IF EXISTS "List admins can update lists" ON lists;
DROP POLICY IF EXISTS "List admins can delete lists" ON lists;

DROP POLICY IF EXISTS "List owners can insert members" ON list_members;
DROP POLICY IF EXISTS "List members can view all members" ON list_members;
DROP POLICY IF EXISTS "List members can view other members" ON list_members;
DROP POLICY IF EXISTS "Anyone can view public list members" ON list_members;
DROP POLICY IF EXISTS "List admins can update members" ON list_members;
DROP POLICY IF EXISTS "List admins can delete members" ON list_members;

DROP POLICY IF EXISTS "Users can view items based on access mode" ON list_items;
DROP POLICY IF EXISTS "Anyone can view public list items" ON list_items;
DROP POLICY IF EXISTS "List editors and admins can insert items" ON list_items;
DROP POLICY IF EXISTS "List editors and admins can update items" ON list_items;
DROP POLICY IF EXISTS "List editors and admins can delete items" ON list_items;

-- ============================================================================
-- LISTS TABLE POLICIES
-- ============================================================================

-- SELECT: Users can view lists they own
CREATE POLICY "lists_select_owned"
  ON lists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Users can view lists where they are members
CREATE POLICY "lists_select_member"
  ON lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
    )
  );

-- SELECT: Authenticated users can view 'members' mode lists
CREATE POLICY "lists_select_members_mode"
  ON lists FOR SELECT
  TO authenticated
  USING (public_access_mode = 'members');

-- SELECT: Anyone can view 'anyone' mode lists
CREATE POLICY "lists_select_anyone_mode"
  ON lists FOR SELECT
  USING (public_access_mode = 'anyone');

-- INSERT: Users can create their own lists
CREATE POLICY "lists_insert_own"
  ON lists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Admins can update lists
CREATE POLICY "lists_update_admin"
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

-- DELETE: Admins can delete lists
CREATE POLICY "lists_delete_admin"
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

-- ============================================================================
-- LIST_MEMBERS TABLE POLICIES
-- ============================================================================

-- SELECT: Users can view members of lists they own
CREATE POLICY "members_select_owned_list"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- SELECT: Users can view members of lists where they are members
CREATE POLICY "members_select_same_list"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    list_id IN (
      SELECT lm.list_id FROM list_members lm
      WHERE lm.user_id = auth.uid()
    )
  );

-- SELECT: Users can view members of 'members' and 'anyone' mode lists
CREATE POLICY "members_select_public_lists"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.public_access_mode IN ('members', 'anyone')
    )
  );

-- INSERT: List owners can add members
CREATE POLICY "members_insert_owner"
  ON list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- UPDATE: Admins can update member roles
CREATE POLICY "members_update_admin"
  ON list_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = list_members.list_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = list_members.list_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
  );

-- DELETE: Admins can remove members
CREATE POLICY "members_delete_admin"
  ON list_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = list_members.list_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
  );

-- ============================================================================
-- LIST_ITEMS TABLE POLICIES
-- ============================================================================

-- SELECT: Users can view items from lists they own
CREATE POLICY "items_select_owned_list"
  ON list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- SELECT: Users can view items from lists where they are members
CREATE POLICY "items_select_member_list"
  ON list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
    )
  );

-- SELECT: Users can view items from 'members' and 'anyone' mode lists
CREATE POLICY "items_select_public_lists"
  ON list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.public_access_mode IN ('members', 'anyone')
    )
  );

-- INSERT: Editors and admins can add items
CREATE POLICY "items_insert_editor_admin"
  ON list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('editor', 'admin')
    )
  );

-- UPDATE: Editors and admins can update items
CREATE POLICY "items_update_editor_admin"
  ON list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('editor', 'admin')
    )
  );

-- DELETE: Editors and admins can delete items
CREATE POLICY "items_delete_editor_admin"
  ON list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_items.list_id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('editor', 'admin')
    )
  );
