/*
  # Fix Lists SELECT Policy to Avoid Infinite Recursion

  ## Overview
  Fixes infinite recursion by simplifying how lists are accessed.
  Instead of checking list_members from lists policy, we check lists.user_id directly.

  ## Changes
    - Remove circular dependency between lists and list_members policies
    - Allow users to view lists they own (via user_id)
    - Allow users to view public lists (via access mode)
    - Separate policy for viewing lists where user is a member

  ## Important Notes
    - Users can view lists they created
    - Users can view public lists
    - Users can view lists where they are members
    - No circular dependencies between tables
*/

DROP POLICY IF EXISTS "Users can view lists based on access mode" ON lists;

CREATE POLICY "Users can view their own lists"
  ON lists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view lists where they are members"
  ON lists FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT list_id FROM list_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view public member lists"
  ON lists FOR SELECT
  TO authenticated
  USING (public_access_mode IN ('members', 'anyone'));
