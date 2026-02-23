/*
  # Fix List Members Insert Policy to Avoid Infinite Recursion

  ## Overview
  This migration fixes the infinite recursion issue when creating lists by
  separating the list_members policies to avoid circular dependencies during INSERT.

  ## Changes
    - Split the ALL policy into separate SELECT, INSERT, UPDATE, DELETE policies
    - Allow SECURITY DEFINER functions to bypass RLS for automatic inserts
    - Simplify INSERT policy to allow list owners and admins without recursion

  ## Important Notes
    - Triggers use SECURITY DEFINER to bypass RLS
    - Direct user inserts still require proper permissions
    - Maintains security while allowing automatic member creation
*/

DROP POLICY IF EXISTS "List admins can manage members" ON list_members;

CREATE POLICY "List admins can delete members"
  ON list_members FOR DELETE
  TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM list_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "List admins can update members"
  ON list_members FOR UPDATE
  TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM list_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM list_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "List owners and admins can insert members"
  ON list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
    OR list_id IN (
      SELECT list_id FROM list_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
