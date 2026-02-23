/*
  # Add Function to Get List Name by Invite Token
  
  ## Purpose
  Provides a secure way to fetch list information when given a valid invite token,
  without needing broad RLS policies that affect all list queries.
  
  ## Changes
  1. Create a function `get_list_name_by_invite_token` that:
     - Takes an invite token as input
     - Validates the invite link (not expired, not maxed out)
     - Returns the list name if the token is valid
     - Returns NULL if the token is invalid
  
  2. Grant execute permission to anon and authenticated users
  
  ## Usage
  This allows the InviteRedeem page to fetch list names without needing
  RLS policies that run on every list SELECT query.
*/

-- Create function to get list name by invite token
CREATE OR REPLACE FUNCTION get_list_name_by_invite_token(invite_token TEXT)
RETURNS TABLE(list_id UUID, list_name TEXT, role TEXT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS list_id,
    l.name AS list_name,
    lil.role
  FROM list_invite_links lil
  JOIN lists l ON l.id = lil.list_id
  WHERE lil.token = invite_token
    AND (lil.expires_at IS NULL OR lil.expires_at > now())
    AND (lil.max_uses IS NULL OR lil.used_count < lil.max_uses);
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_list_name_by_invite_token(TEXT) TO anon, authenticated;
