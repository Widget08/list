/*
# Add account age function

1. New Functions
- `get_account_age_days(p_user_id uuid)` — returns the number of full days since the user's profile was created.
  Computed live from `user_profiles.created_at`, so it automatically increments by 1 each calendar day without any cron job or stored counter.
2. Security
- Function is executable by `authenticated` only (revoked from PUBLIC and anon) since it reads profile data scoped to the calling user.
*/

CREATE OR REPLACE FUNCTION public.get_account_age_days(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(EXTRACT(day FROM now() - created_at)::integer, 0)
  FROM public.user_profiles
  WHERE id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_account_age_days(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_age_days(uuid) TO authenticated;
