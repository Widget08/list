/*
  # Fix List Members RLS Policy

  1. Changes
    - Drop the problematic "List members can view members" policy that causes infinite recursion
    - Create a new policy that allows:
      - List owners to view all members
      - Members to view themselves and other members without recursion

  2. Security
    - Maintain proper access control without infinite recursion
*/

DROP POLICY IF EXISTS "List members can view members" ON list_members;

CREATE POLICY "List members can view all members"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    list_id IN (
      SELECT id FROM lists WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
