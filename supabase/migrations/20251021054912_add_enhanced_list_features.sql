/*
  Enhanced List Features Migration

  Overview:
  This migration adds comprehensive features to the lists application including
  list settings, URL metadata, status management, voting, rating, commenting,
  and sharing/permissions systems.

  Modified Tables - lists:
  - is_public (boolean) - Whether the list is publicly accessible
  - share_token (text, unique) - Unique token for sharing the list

  Modified Tables - list_items:
  - url (text) - Source URL for the item
  - status (text) - Current status
  - upvotes (integer) - Number of upvotes
  - metadata (jsonb) - JSON object for storing URL metadata

  New Tables:
  1. list_settings - Configuration for each list enabled features
  2. list_statuses - Custom status options for each list
  3. list_ratings - User ratings for list items
  4. list_comments - Comments on list items
  5. list_members - Shared list members and permissions
  6. list_votes - Track individual user votes

  Security: RLS enabled on all tables with policies for owners, members, and public access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE lists ADD COLUMN is_public boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE lists ADD COLUMN share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'url'
  ) THEN
    ALTER TABLE list_items ADD COLUMN url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'status'
  ) THEN
    ALTER TABLE list_items ADD COLUMN status text DEFAULT 'backlog';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'upvotes'
  ) THEN
    ALTER TABLE list_items ADD COLUMN upvotes integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE list_items ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS list_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enable_status boolean DEFAULT true NOT NULL,
  enable_voting boolean DEFAULT false NOT NULL,
  enable_downvote boolean DEFAULT false NOT NULL,
  enable_rating boolean DEFAULT false NOT NULL,
  enable_shuffle boolean DEFAULT false NOT NULL,
  enable_ordering boolean DEFAULT true NOT NULL,
  enable_comments boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS list_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS list_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_item_id uuid REFERENCES list_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(list_item_id, user_id)
);

CREATE TABLE IF NOT EXISTS list_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_item_id uuid REFERENCES list_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(list_id, user_id)
);

CREATE TABLE IF NOT EXISTS list_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_item_id uuid REFERENCES list_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(list_item_id, user_id)
);

ALTER TABLE list_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "List owners can manage settings"
  ON list_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_settings.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "List members can view settings"
  ON list_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_settings.list_id
      AND list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can manage statuses"
  ON list_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_statuses.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "List members can view statuses"
  ON list_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_statuses.list_id
      AND list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own ratings"
  ON list_ratings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all ratings"
  ON list_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own comments"
  ON list_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON list_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON list_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view comments"
  ON list_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "List owners can manage members"
  ON list_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "List members can view members"
  ON list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = list_members.list_id
      AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own votes"
  ON list_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON list_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view votes"
  ON list_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS list_settings_list_id_idx ON list_settings(list_id);
CREATE INDEX IF NOT EXISTS list_statuses_list_id_idx ON list_statuses(list_id);
CREATE INDEX IF NOT EXISTS list_ratings_list_item_id_idx ON list_ratings(list_item_id);
CREATE INDEX IF NOT EXISTS list_comments_list_item_id_idx ON list_comments(list_item_id);
CREATE INDEX IF NOT EXISTS list_members_list_id_idx ON list_members(list_id);
CREATE INDEX IF NOT EXISTS list_members_user_id_idx ON list_members(user_id);
CREATE INDEX IF NOT EXISTS list_votes_list_item_id_idx ON list_votes(list_item_id);
CREATE INDEX IF NOT EXISTS lists_share_token_idx ON lists(share_token);

CREATE OR REPLACE FUNCTION create_default_list_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO list_settings (list_id)
  VALUES (NEW.id);
  
  INSERT INTO list_statuses (list_id, name, position)
  VALUES 
    (NEW.id, 'backlog', 0),
    (NEW.id, 'in progress', 1),
    (NEW.id, 'done', 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_default_list_settings_trigger ON lists;
CREATE TRIGGER create_default_list_settings_trigger
  AFTER INSERT ON lists
  FOR EACH ROW
  EXECUTE FUNCTION create_default_list_settings();
