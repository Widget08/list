/*
  # Reconcile FK Index Coverage vs Unused Index Warnings

  ## Summary

  The advisor alternates between flagging FK columns as missing indexes and
  flagging newly created indexes as unused (because pg_stat resets on creation).
  This migration adds the 5 FK covering indexes that are currently missing and
  drops the 6 flagged as unused since last stats reset.

  ## Changes

  1. Add FK covering indexes (currently missing)
     - list_comments.user_id
     - list_invite_links.created_by
     - list_members.invited_by
     - list_ratings.user_id
     - list_votes.user_id

  2. Drop unused indexes (flagged by advisor, zero recorded usage)
     - list_comments_list_item_id_idx
     - list_invite_links_list_id_idx
     - list_item_comments_list_item_id_idx
     - list_item_comments_user_id_idx
     - list_items_user_id_idx
     - list_members_user_id_idx
*/

-- ============================================================
-- 1. ADD MISSING FK COVERING INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS list_comments_user_id_idx
  ON public.list_comments (user_id);

CREATE INDEX IF NOT EXISTS list_invite_links_created_by_idx
  ON public.list_invite_links (created_by);

CREATE INDEX IF NOT EXISTS list_members_invited_by_idx
  ON public.list_members (invited_by);

CREATE INDEX IF NOT EXISTS list_ratings_user_id_idx
  ON public.list_ratings (user_id);

CREATE INDEX IF NOT EXISTS list_votes_user_id_idx
  ON public.list_votes (user_id);

-- ============================================================
-- 2. DROP INDEXES FLAGGED AS UNUSED
-- ============================================================

DROP INDEX IF EXISTS public.list_comments_list_item_id_idx;
DROP INDEX IF EXISTS public.list_invite_links_list_id_idx;
DROP INDEX IF EXISTS public.list_item_comments_list_item_id_idx;
DROP INDEX IF EXISTS public.list_item_comments_user_id_idx;
DROP INDEX IF EXISTS public.list_items_user_id_idx;
DROP INDEX IF EXISTS public.list_members_user_id_idx;
