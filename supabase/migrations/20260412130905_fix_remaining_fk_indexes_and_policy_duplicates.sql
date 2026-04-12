/*
  # Fix Remaining FK Indexes and Duplicate Permissive Policies

  ## Summary

  1. Add Indexes for Unindexed Foreign Keys
     - list_comments.list_item_id
     - list_invite_links.list_id
     - list_item_comments.list_item_id and user_id
     - list_items.user_id
     - list_members.user_id
     - lists.user_id

  2. Drop Unused Indexes (never queried since last stats reset)
     - list_comments_user_id_idx, list_invite_links_created_by_idx,
       list_members_invited_by_idx, list_ratings_user_id_idx, list_votes_user_id_idx

  3. Fix Multiple Permissive Policies
     - list_comments anon SELECT: drop standalone SELECT (ALL policy already covers it)
     - list_ratings anon SELECT: same pattern
     - list_votes anon SELECT: same pattern
     - list_invite_links authenticated SELECT: split ALL into per-action policies so
       the existing SELECT-only policy for redemption does not conflict
     - list_settings authenticated SELECT: change ALL to INSERT/UPDATE/DELETE only
       so it does not duplicate the dedicated SELECT policy
     - list_statuses authenticated SELECT: same pattern
     - list_members authenticated INSERT: merge two INSERT policies into one with OR
*/

-- ============================================================
-- 1. ADD MISSING FK INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS list_comments_list_item_id_idx
  ON public.list_comments (list_item_id);

CREATE INDEX IF NOT EXISTS list_invite_links_list_id_idx
  ON public.list_invite_links (list_id);

CREATE INDEX IF NOT EXISTS list_item_comments_list_item_id_idx
  ON public.list_item_comments (list_item_id);

CREATE INDEX IF NOT EXISTS list_item_comments_user_id_idx
  ON public.list_item_comments (user_id);

CREATE INDEX IF NOT EXISTS list_items_user_id_idx
  ON public.list_items (user_id);

CREATE INDEX IF NOT EXISTS list_members_user_id_idx
  ON public.list_members (user_id);

CREATE INDEX IF NOT EXISTS lists_user_id_idx
  ON public.lists (user_id);

-- ============================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.list_comments_user_id_idx;
DROP INDEX IF EXISTS public.list_invite_links_created_by_idx;
DROP INDEX IF EXISTS public.list_members_invited_by_idx;
DROP INDEX IF EXISTS public.list_ratings_user_id_idx;
DROP INDEX IF EXISTS public.list_votes_user_id_idx;

-- ============================================================
-- 3. FIX list_comments: drop redundant anon SELECT policy
--    "Anonymous users can manage comments in public lists" (ALL)
--    already covers SELECT, so the standalone SELECT is a duplicate.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view public list comments" ON public.list_comments;

-- ============================================================
-- 4. FIX list_ratings: drop redundant anon SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view public list ratings" ON public.list_ratings;

-- ============================================================
-- 5. FIX list_votes: drop redundant anon SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view public list votes" ON public.list_votes;

-- ============================================================
-- 6. FIX list_invite_links: split ALL policy into explicit
--    INSERT/UPDATE/DELETE so it no longer conflicts with the
--    dedicated SELECT policy used for invite redemption.
-- ============================================================

DROP POLICY IF EXISTS "List owners and admins can manage invite links" ON public.list_invite_links;

CREATE POLICY "List owners and admins can insert invite links"
  ON public.list_invite_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_invite_links.list_id
      AND lists.user_id = (select auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
      AND list_members.user_id = (select auth.uid())
      AND list_members.role = 'admin'
    )
  );

CREATE POLICY "List owners and admins can update invite links"
  ON public.list_invite_links FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_invite_links.list_id
      AND lists.user_id = (select auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
      AND list_members.user_id = (select auth.uid())
      AND list_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_invite_links.list_id
      AND lists.user_id = (select auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
      AND list_members.user_id = (select auth.uid())
      AND list_members.role = 'admin'
    )
  );

CREATE POLICY "List owners and admins can delete invite links"
  ON public.list_invite_links FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_invite_links.list_id
      AND lists.user_id = (select auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = list_invite_links.list_id
      AND list_members.user_id = (select auth.uid())
      AND list_members.role = 'admin'
    )
  );

-- ============================================================
-- 7. FIX list_settings: replace ALL with INSERT/UPDATE/DELETE
--    so it no longer overlaps with "Users can view list settings"
--    (SELECT). Non-admin members keep read access via that policy.
-- ============================================================

DROP POLICY IF EXISTS "List admins can manage settings" ON public.list_settings;

CREATE POLICY "List admins can insert settings"
  ON public.list_settings FOR INSERT TO authenticated
  WITH CHECK (user_is_list_admin(list_id, (select auth.uid())));

CREATE POLICY "List admins can update settings"
  ON public.list_settings FOR UPDATE TO authenticated
  USING (user_is_list_admin(list_id, (select auth.uid())))
  WITH CHECK (user_is_list_admin(list_id, (select auth.uid())));

CREATE POLICY "List admins can delete settings"
  ON public.list_settings FOR DELETE TO authenticated
  USING (user_is_list_admin(list_id, (select auth.uid())));

-- ============================================================
-- 8. FIX list_statuses: replace ALL with INSERT/UPDATE/DELETE
--    so it no longer overlaps with "Users can view list statuses"
-- ============================================================

DROP POLICY IF EXISTS "List admins can manage statuses" ON public.list_statuses;

CREATE POLICY "List admins can insert statuses"
  ON public.list_statuses FOR INSERT TO authenticated
  WITH CHECK (user_is_list_admin(list_id, (select auth.uid())));

CREATE POLICY "List admins can update statuses"
  ON public.list_statuses FOR UPDATE TO authenticated
  USING (user_is_list_admin(list_id, (select auth.uid())))
  WITH CHECK (user_is_list_admin(list_id, (select auth.uid())));

CREATE POLICY "List admins can delete statuses"
  ON public.list_statuses FOR DELETE TO authenticated
  USING (user_is_list_admin(list_id, (select auth.uid())));

-- ============================================================
-- 9. FIX list_members: merge two INSERT policies into one
--    with OR so there is only a single permissive INSERT policy.
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert list members" ON public.list_members;
DROP POLICY IF EXISTS "Users can join via valid invite link" ON public.list_members;

CREATE POLICY "Users can be added to lists"
  ON public.list_members FOR INSERT TO authenticated
  WITH CHECK (
    user_is_list_admin(list_id, (select auth.uid()))
    OR (
      user_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM list_invite_links
        WHERE list_invite_links.list_id = list_members.list_id
        AND (list_invite_links.expires_at IS NULL OR list_invite_links.expires_at > now())
        AND (list_invite_links.max_uses IS NULL OR list_invite_links.used_count < list_invite_links.max_uses)
      )
    )
  );
