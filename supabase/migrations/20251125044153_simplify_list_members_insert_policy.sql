/*
  # Simplify List Members Insert Policy to Prevent Recursion

  ## Overview
  Removes circular dependency in INSERT policy by only checking list ownership,
  not existing membership. The trigger uses SECURITY DEFINER so it bypasses RLS.

  ## Changes
    - Simplify INSERT policy to only check list ownership
    - Remove the admin check that causes recursion
    - Relies on SECURITY DEFINER trigger for automatic member creation
    - Manual member additions still require list ownership

  ## Important Notes
    - First member is always created by trigger (SECURITY DEFINER)
    - Additional members can only be added by list owner
    - Admins can modify/delete members via their respective policies
*/

DROP POLICY IF EXISTS "List owners and admins can insert members" ON list_members;

CREATE POLICY "List owners can insert members"
  ON list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );
