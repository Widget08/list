/*
  # Add UPDATE Policy for List Members
  
  ## Changes
  Adds missing UPDATE policy for the list_members table to allow admins to update member roles.
  
  ## Security
  - Only list admins (owner or admin role members) can update member roles
  - Validates admin status through the existing user_is_list_admin helper function
*/

CREATE POLICY "Admins can update list members"
  ON list_members FOR UPDATE
  TO authenticated
  USING (user_is_list_admin(list_id, auth.uid()))
  WITH CHECK (user_is_list_admin(list_id, auth.uid()));
