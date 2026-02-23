/*
  # Remove Problematic Invite Link RLS Policy
  
  ## Problem
  The "Anyone can view list name with valid invite link" policy on the lists table
  runs an EXISTS subquery on EVERY SELECT query, causing performance issues and
  conflicts with normal list loading operations.
  
  ## Changes
  1. Drop the "Anyone can view list name with valid invite link" policy
     - This policy was checking invite_links on every list query
     - It affected all dashboard queries, not just invite redemption
  
  2. Keep the list_members policy intact
     - The "Users can join via valid invite link" policy on list_members is fine
     - It only runs during INSERT operations, not frequent SELECT queries
  
  ## Alternative Approach
  Instead of using a broad RLS policy, the InviteRedeem page will:
  - Fetch the invite_link record directly (already readable by anon/authenticated)
  - Use the list_id from the invite_link to access list information
  - This is more efficient and targeted than a blanket RLS policy
*/

-- Drop the problematic policy that affects all list SELECT queries
DROP POLICY IF EXISTS "Anyone can view list name with valid invite link" ON lists;
