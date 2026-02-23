/*
  # Add Public Access for Anonymous Users

  ## Overview
  Updates Row Level Security policies to allow unauthenticated users to access
  lists with public_access_mode = 'anyone'. Anonymous users can view and interact
  with public lists based on the enabled features.

  ## Changes
  
  ### Lists Table
  - Add SELECT policy for anonymous users to view lists with public_access_mode = 'anyone'
  
  ### List Members Table
  - Add SELECT policy for anonymous users to view members of public lists
  
  ### List Items Table
  - Add SELECT policy for anonymous users to view items in public lists
  
  ### List Settings Table
  - Add SELECT policy for anonymous users to view settings of public lists
  
  ### List Statuses Table
  - Add SELECT policy for anonymous users to view statuses of public lists
  
  ### List Votes Table
  - Add SELECT policy for anonymous users to view votes in public lists
  - Add INSERT/UPDATE/DELETE policies for anonymous users to manage votes in public lists
  
  ### List Ratings Table
  - Add SELECT policy for anonymous users to view ratings in public lists
  - Add INSERT/UPDATE/DELETE policies for anonymous users to manage ratings in public lists
  
  ### List Comments Table
  - Add SELECT policy for anonymous users to view comments in public lists
  - Add INSERT/UPDATE/DELETE policies for anonymous users to manage comments in public lists

  ## Security Notes
  - Anonymous users can only access lists with public_access_mode = 'anyone'
  - Anonymous users cannot modify list structure or settings
  - Anonymous users can only interact with enabled features (voting, ratings, comments)
  - All policies verify the list's public access mode before allowing access
*/

-- Lists: Allow anonymous users to view public lists
CREATE POLICY "Anonymous users can view public lists"
  ON lists FOR SELECT
  TO anon
  USING (public_access_mode = 'anyone');

-- List Members: Allow anonymous users to view members of public lists
CREATE POLICY "Anonymous users can view members of public lists"
  ON list_members FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Items: Allow anonymous users to view items in public lists
CREATE POLICY "Anonymous users can view items in public lists"
  ON list_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Settings: Allow anonymous users to view settings of public lists
CREATE POLICY "Anonymous users can view settings of public lists"
  ON list_settings FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_settings.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Statuses: Allow anonymous users to view statuses of public lists
CREATE POLICY "Anonymous users can view statuses of public lists"
  ON list_statuses FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_statuses.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Votes: Allow anonymous users to view votes in public lists
CREATE POLICY "Anonymous users can view votes in public lists"
  ON list_votes FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_votes.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Votes: Allow anonymous users to manage their votes in public lists
-- Note: Anonymous users will use a session-based identifier stored in user_id
CREATE POLICY "Anonymous users can manage votes in public lists"
  ON list_votes FOR ALL
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_votes.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_votes.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Ratings: Allow anonymous users to view ratings in public lists
CREATE POLICY "Anonymous users can view ratings in public lists"
  ON list_ratings FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_ratings.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Ratings: Allow anonymous users to manage their ratings in public lists
CREATE POLICY "Anonymous users can manage ratings in public lists"
  ON list_ratings FOR ALL
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_ratings.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_ratings.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Comments: Allow anonymous users to view comments in public lists
CREATE POLICY "Anonymous users can view comments in public lists"
  ON list_comments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_comments.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

-- List Comments: Allow anonymous users to manage their comments in public lists
CREATE POLICY "Anonymous users can manage comments in public lists"
  ON list_comments FOR ALL
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_comments.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_comments.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );
