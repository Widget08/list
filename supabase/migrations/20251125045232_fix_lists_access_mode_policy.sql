/*
  # Fix Lists Access Mode Policy

  ## Overview
  Corrects the SELECT policy to properly implement the access modes:
  - none: Only list owner and explicit members can view
  - members: Any authenticated user can view
  - anyone: Anyone can view (even anonymous)

  ## Changes
    - Remove duplicate "Users can view public member lists" policy
    - Keep "Anyone can view public lists" for 'anyone' mode
    - Add proper policy for 'members' mode (authenticated users only)
    - Users can view lists they own
    - Users can view lists where they are explicit members

  ## Important Notes
    - 'none' mode: Only owner and list_members can view
    - 'members' mode: All authenticated users can view
    - 'anyone' mode: Everyone can view
*/

DROP POLICY IF EXISTS "Users can view public member lists" ON lists;

CREATE POLICY "Authenticated users can view member-shared lists"
  ON lists FOR SELECT
  TO authenticated
  USING (public_access_mode = 'members');
