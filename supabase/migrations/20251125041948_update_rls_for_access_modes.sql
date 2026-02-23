/*
  # Update RLS Policies for Public Access Modes

  ## Overview
  This migration updates RLS policies to support the new public access modes:
  - none: Only list members can access
  - members: Any authenticated user gets view access
  - anyone: Anyone with the link can view (no auth required)

  ## Access Control Rules
    - **none**: Existing member-based access only
    - **members**: Authenticated users automatically get view access
    - **anyone**: Public access for viewing and interactions

  ## Security Changes
    - Update lists policies to handle public access modes
    - Update list_items policies for public viewing
    - Update feature policies (voting, ratings, comments) for public access
    - Ensure write operations still require proper permissions

  ## Important Notes
    - View access via 'members' mode does not grant edit rights
    - Users with explicit roles always use their assigned role
    - Public access ('anyone') allows unauthenticated viewing
*/

DROP POLICY IF EXISTS "Users can view lists they have access to" ON lists;

CREATE POLICY "Users can view lists based on access mode"
  ON lists FOR SELECT
  TO authenticated
  USING (
    public_access_mode IN ('members', 'anyone')
    OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view public lists"
  ON lists FOR SELECT
  TO anon
  USING (public_access_mode = 'anyone');

DROP POLICY IF EXISTS "List members can view items" ON list_items;

CREATE POLICY "Users can view items based on access mode"
  ON list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members
          WHERE list_members.list_id = lists.id
          AND list_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can view public list items"
  ON list_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

DROP POLICY IF EXISTS "List members can view settings" ON list_settings;

CREATE POLICY "Users can view settings based on access"
  ON list_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_settings.list_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members
          WHERE list_members.list_id = lists.id
          AND list_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can view public list settings"
  ON list_settings FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_settings.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

DROP POLICY IF EXISTS "List members can view statuses" ON list_statuses;

CREATE POLICY "Users can view statuses based on access"
  ON list_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_statuses.list_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members
          WHERE list_members.list_id = lists.id
          AND list_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can view public list statuses"
  ON list_statuses FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_statuses.list_id
      AND lists.public_access_mode = 'anyone'
    )
  );

DROP POLICY IF EXISTS "Users can view all ratings" ON list_ratings;

CREATE POLICY "Users can view ratings based on list access"
  ON list_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_ratings.list_item_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members
          WHERE list_members.list_id = lists.id
          AND list_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can view public list ratings"
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

CREATE POLICY "Users can rate in public lists"
  ON list_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_ratings.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

DROP POLICY IF EXISTS "Users can view comments" ON list_comments;

CREATE POLICY "Users can view comments based on list access"
  ON list_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_comments.list_item_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members
          WHERE list_members.list_id = lists.id
          AND list_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can view public list comments"
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

CREATE POLICY "Users can comment in public lists"
  ON list_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_comments.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

DROP POLICY IF EXISTS "Users can view votes" ON list_votes;

CREATE POLICY "Users can view votes based on list access"
  ON list_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_votes.list_item_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members
          WHERE list_members.list_id = lists.id
          AND list_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can view public list votes"
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

CREATE POLICY "Users can vote in public lists"
  ON list_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM list_items
      JOIN lists ON lists.id = list_items.list_id
      WHERE list_items.id = list_votes.list_item_id
      AND lists.public_access_mode = 'anyone'
    )
  );

DROP POLICY IF EXISTS "List members can view other members" ON list_members;

CREATE POLICY "Users can view members based on list access"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND (
        lists.public_access_mode IN ('members', 'anyone')
        OR EXISTS (
          SELECT 1 FROM list_members lm
          WHERE lm.list_id = lists.id
          AND lm.user_id = auth.uid()
        )
      )
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
