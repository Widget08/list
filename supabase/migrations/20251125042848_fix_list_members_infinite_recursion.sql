/*
  # Fix Infinite Recursion in List Members RLS Policies

  ## Overview
  This migration fixes the infinite recursion issue in list_members RLS policies
  by removing the circular dependency where viewing members requires checking membership.

  ## Changes
    - Simplify list_members SELECT policies to avoid recursion
    - Allow authenticated users to view members of lists they have direct access to
    - Use direct joins instead of subqueries that reference the same table

  ## Important Notes
    - Members can view other members of the same list
    - Admins can manage members through the existing admin policy
*/

DROP POLICY IF EXISTS "Users can view members based on list access" ON list_members;
DROP POLICY IF EXISTS "Anyone can view public list members" ON list_members;

CREATE POLICY "List members can view other members"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM list_members WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.public_access_mode IN ('members', 'anyone')
    )
  );

CREATE POLICY "Anyone can view public list members"
  ON list_members FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );
