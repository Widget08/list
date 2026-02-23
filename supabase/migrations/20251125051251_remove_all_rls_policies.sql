/*
  # Remove All RLS Policies

  ## Overview
  Removes all RLS policies from lists, list_members, and list_items tables.
  RLS remains enabled on the tables but no policies are enforced.

  ## Changes
    - Drop all policies from lists table
    - Drop all policies from list_members table
    - Drop all policies from list_items table

  ## Important Notes
    - RLS is still enabled, so tables are locked by default
    - No access will be allowed until new policies are added
*/

-- Drop all lists policies
DROP POLICY IF EXISTS "lists_select_owned" ON lists;
DROP POLICY IF EXISTS "lists_select_member" ON lists;
DROP POLICY IF EXISTS "lists_select_members_mode" ON lists;
DROP POLICY IF EXISTS "lists_select_anyone_mode" ON lists;
DROP POLICY IF EXISTS "lists_insert_own" ON lists;
DROP POLICY IF EXISTS "lists_update_admin" ON lists;
DROP POLICY IF EXISTS "lists_delete_admin" ON lists;

-- Drop all list_members policies
DROP POLICY IF EXISTS "members_select_owned_list" ON list_members;
DROP POLICY IF EXISTS "members_select_same_list" ON list_members;
DROP POLICY IF EXISTS "members_select_public_lists" ON list_members;
DROP POLICY IF EXISTS "members_insert_owner" ON list_members;
DROP POLICY IF EXISTS "members_update_admin" ON list_members;
DROP POLICY IF EXISTS "members_delete_admin" ON list_members;

-- Drop all list_items policies
DROP POLICY IF EXISTS "items_select_owned_list" ON list_items;
DROP POLICY IF EXISTS "items_select_member_list" ON list_items;
DROP POLICY IF EXISTS "items_select_public_lists" ON list_items;
DROP POLICY IF EXISTS "items_insert_editor_admin" ON list_items;
DROP POLICY IF EXISTS "items_update_editor_admin" ON list_items;
DROP POLICY IF EXISTS "items_delete_editor_admin" ON list_items;
