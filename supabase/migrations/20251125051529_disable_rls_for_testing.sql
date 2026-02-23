/*
  # Disable RLS for Testing

  ## Overview
  Temporarily disables Row Level Security on all tables to allow testing
  without policy restrictions.

  ## Changes
    - Disable RLS on lists table
    - Disable RLS on list_members table
    - Disable RLS on list_items table

  ## Important Notes
    - This is for testing purposes only
    - RLS should be re-enabled before production
    - All data will be accessible to authenticated users
*/

ALTER TABLE lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE list_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE list_items DISABLE ROW LEVEL SECURITY;
