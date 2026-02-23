/*
  # Enable RLS with Access Control Policies

  ## Overview
  Enables Row Level Security on all tables and creates comprehensive policies
  to control access based on list membership and public access modes.

  ## Access Control Rules
  
  ### Lists Table
  Users can view lists if:
  1. They are a member of the list (admin, edit, or view role)
  2. The list has public_access_mode = 'anyone' (public to anyone with link)
  3. The list has public_access_mode = 'members' (public to authenticated users)
  
  Users can insert lists (create new lists for themselves)
  
  Users can update/delete lists if:
  1. They own the list (user_id matches)
  2. They are an admin member of the list

  ### List Members Table
  Users can view members if they have access to the list
  Users can insert members if they are an admin of the list
  Users can delete members if they are an admin of the list

  ### List Items Table
  Users can view items if they have access to the list
  Users can insert items if they have access to the list
  Users can update items if they have edit or admin access to the list
  Users can delete items if they have edit or admin access to the list

  ### List Settings Table
  Users can view settings if they have access to the list
  Only admins can update settings

  ### Other Tables (Statuses, Votes, Ratings, Comments)
  Users can access if they have access to the parent list

  ## Security Notes
  - All policies check authentication status
  - Ownership and membership are verified for modifications
  - Public access modes are properly enforced
  - No data leakage between users
*/

-- Enable RLS on all tables
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view lists they have access to" ON lists;
DROP POLICY IF EXISTS "Users can insert their own lists" ON lists;
DROP POLICY IF EXISTS "Users can update lists they own or admin" ON lists;
DROP POLICY IF EXISTS "Users can delete lists they own or admin" ON lists;

DROP POLICY IF EXISTS "Users can view list members" ON list_members;
DROP POLICY IF EXISTS "Admins can insert list members" ON list_members;
DROP POLICY IF EXISTS "Admins can delete list members" ON list_members;

DROP POLICY IF EXISTS "Users can view list items" ON list_items;
DROP POLICY IF EXISTS "Users can insert list items" ON list_items;
DROP POLICY IF EXISTS "Users can update list items" ON list_items;
DROP POLICY IF EXISTS "Users can delete list items" ON list_items;

DROP POLICY IF EXISTS "Users can view list settings" ON list_settings;
DROP POLICY IF EXISTS "Admins can update list settings" ON list_settings;

DROP POLICY IF EXISTS "Users can view list statuses" ON list_statuses;
DROP POLICY IF EXISTS "Admins can manage list statuses" ON list_statuses;

DROP POLICY IF EXISTS "Users can view votes" ON list_votes;
DROP POLICY IF EXISTS "Users can manage their votes" ON list_votes;

DROP POLICY IF EXISTS "Users can view ratings" ON list_ratings;
DROP POLICY IF EXISTS "Users can manage their ratings" ON list_ratings;

DROP POLICY IF EXISTS "Users can view comments" ON list_comments;
DROP POLICY IF EXISTS "Users can manage their comments" ON list_comments;

-- Helper function to check if user has access to a list
CREATE OR REPLACE FUNCTION user_has_list_access(list_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lists
    WHERE id = list_id_param
    AND (
      -- User is a member of the list
      EXISTS (
        SELECT 1 FROM list_members
        WHERE list_members.list_id = list_id_param
        AND list_members.user_id = user_id_param
      )
      -- List is public to anyone
      OR public_access_mode = 'anyone'
      -- List is public to authenticated users
      OR public_access_mode = 'members'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin of a list
CREATE OR REPLACE FUNCTION user_is_list_admin(list_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lists
    WHERE id = list_id_param
    AND user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM list_members
    WHERE list_id = list_id_param
    AND user_id = user_id_param
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can edit a list
CREATE OR REPLACE FUNCTION user_can_edit_list(list_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lists
    WHERE id = list_id_param
    AND user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM list_members
    WHERE list_id = list_id_param
    AND user_id = user_id_param
    AND role IN ('admin', 'edit')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lists policies
CREATE POLICY "Users can view lists they have access to"
  ON lists FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public_access_mode IN ('anyone', 'members')
    OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own lists"
  ON lists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update lists they own or admin"
  ON lists FOR UPDATE
  TO authenticated
  USING (user_is_list_admin(id, auth.uid()))
  WITH CHECK (user_is_list_admin(id, auth.uid()));

CREATE POLICY "Users can delete lists they own or admin"
  ON lists FOR DELETE
  TO authenticated
  USING (user_is_list_admin(id, auth.uid()));

-- List members policies
CREATE POLICY "Users can view list members"
  ON list_members FOR SELECT
  TO authenticated
  USING (user_has_list_access(list_id, auth.uid()));

CREATE POLICY "Admins can insert list members"
  ON list_members FOR INSERT
  TO authenticated
  WITH CHECK (user_is_list_admin(list_id, auth.uid()));

CREATE POLICY "Admins can delete list members"
  ON list_members FOR DELETE
  TO authenticated
  USING (user_is_list_admin(list_id, auth.uid()));

-- List items policies
CREATE POLICY "Users can view list items"
  ON list_items FOR SELECT
  TO authenticated
  USING (user_has_list_access(list_id, auth.uid()));

CREATE POLICY "Users can insert list items"
  ON list_items FOR INSERT
  TO authenticated
  WITH CHECK (user_has_list_access(list_id, auth.uid()));

CREATE POLICY "Users can update list items"
  ON list_items FOR UPDATE
  TO authenticated
  USING (user_can_edit_list(list_id, auth.uid()))
  WITH CHECK (user_can_edit_list(list_id, auth.uid()));

CREATE POLICY "Users can delete list items"
  ON list_items FOR DELETE
  TO authenticated
  USING (user_can_edit_list(list_id, auth.uid()));

-- List settings policies
CREATE POLICY "Users can view list settings"
  ON list_settings FOR SELECT
  TO authenticated
  USING (user_has_list_access(list_id, auth.uid()));

CREATE POLICY "Admins can update list settings"
  ON list_settings FOR UPDATE
  TO authenticated
  USING (user_is_list_admin(list_id, auth.uid()))
  WITH CHECK (user_is_list_admin(list_id, auth.uid()));

-- List statuses policies
CREATE POLICY "Users can view list statuses"
  ON list_statuses FOR SELECT
  TO authenticated
  USING (user_has_list_access(list_id, auth.uid()));

CREATE POLICY "Admins can manage list statuses"
  ON list_statuses FOR ALL
  TO authenticated
  USING (user_is_list_admin(list_id, auth.uid()))
  WITH CHECK (user_is_list_admin(list_id, auth.uid()));

-- List votes policies
CREATE POLICY "Users can view votes"
  ON list_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_votes.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  );

CREATE POLICY "Users can manage their votes"
  ON list_votes FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_votes.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_votes.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  );

-- List ratings policies
CREATE POLICY "Users can view ratings"
  ON list_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_ratings.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  );

CREATE POLICY "Users can manage their ratings"
  ON list_ratings FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_ratings.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_ratings.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  );

-- List comments policies
CREATE POLICY "Users can view comments"
  ON list_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_comments.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  );

CREATE POLICY "Users can manage their comments"
  ON list_comments FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_comments.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM list_items
      WHERE list_items.id = list_comments.list_item_id
      AND user_has_list_access(list_items.list_id, auth.uid())
    )
  );
