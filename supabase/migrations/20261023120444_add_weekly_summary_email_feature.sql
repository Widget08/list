/*
# Add weekly summary email feature

1. Schema Changes
- Added `weekly_summary_enabled` (boolean, default false) column to `user_profiles`.
  Users can opt in to receiving a weekly stats email from their profile page.

2. New Functions
- `get_user_weekly_stats(p_user_id uuid)` — SECURITY DEFINER function that returns
  a JSON object with the user's list stats: total lists, total items, completed items,
  items added this week, and a per-list breakdown (list name + item count).
  Runs as service_role to bypass RLS so it can aggregate across all the user's lists.

3. Extensions
- Enables `pg_cron` (in the `extensions` schema) if available.
- Creates a weekly cron job that calls the edge function `weekly-summary` every Monday at 9 AM UTC.
  The cron job uses `pg_net` to make an HTTP POST to the edge function endpoint.

4. Security
- `get_user_weekly_stats` is a SECURITY DEFINER function: REVOKE from PUBLIC/anon,
  GRANT EXECUTE to authenticated only.
- The `weekly_summary_enabled` column is user-updatable through existing RLS policies
  on user_profiles (users can update their own row).
*/

-- Add opt-in column
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS weekly_summary_enabled boolean NOT NULL DEFAULT false;

-- Grant update on the new column to authenticated (existing table-level grant covers it,
-- but be explicit for the column)
GRANT UPDATE (weekly_summary_enabled) ON public.user_profiles TO authenticated;

-- Create the stats function
CREATE OR REPLACE FUNCTION public.get_user_weekly_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_lists', (
      SELECT count(*)::int FROM lists WHERE lists.user_id = p_user_id
    ),
    'total_items', (
      SELECT count(*)::int FROM list_items WHERE list_items.user_id = p_user_id
    ),
    'completed_items', (
      SELECT count(*)::int FROM list_items WHERE list_items.user_id = p_user_id AND list_items.completed = true
    ),
    'items_added_this_week', (
      SELECT count(*)::int FROM list_items
      WHERE list_items.user_id = p_user_id
        AND list_items.created_at >= now() - interval '7 days'
    ),
    'lists', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name', lst.name,
            'item_count', (
              SELECT count(*)::int FROM list_items WHERE list_items.list_id = lst.id
            ),
            'completed_count', (
              SELECT count(*)::int FROM list_items WHERE list_items.list_id = lst.id AND list_items.completed = true
            )
          )
          ORDER BY lst.name
        ),
        '[]'::jsonb
      )
      FROM lists lst
      WHERE lst.user_id = p_user_id
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_weekly_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_weekly_stats(uuid) TO authenticated;

-- Enable pg_cron if available, then set up the weekly schedule
DO $$
BEGIN
  -- Try to enable pg_cron
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      -- pg_cron not available on this plan; the edge function can be triggered
      -- manually or via an external scheduler instead
      RAISE NOTICE 'pg_cron extension not available — skipping cron job setup';
  END;

  -- If pg_cron was enabled, schedule the weekly job
  BEGIN
    -- Unschedule any existing version first
    PERFORM cron.unschedule('weekly-summary-email') WHERE EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    );

    -- Schedule: every Monday at 09:00 UTC
    -- Uses pg_net to POST to the weekly-summary edge function
    PERFORM cron.schedule(
      'weekly-summary-email',
      '0 9 * * 1',
      $cron$
        SELECT net.http_post(
          url := 'https://fbtxcwugbtfovfkwsubs.supabase.co/functions/v1/weekly-summary',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT setting FROM pg_settings WHERE name = 'supabase_service_role_key' LIMIT 1)
          ),
          body := '{}'::jsonb
        )
      $cron$
    ) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
  END;
END
$$;
