-- Migration: Fix RLS policies for proper user authentication
-- This migration fixes the clubs RLS policies to work with the users table relationship

-- =======================
-- 1) FIX CLUBS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "clubs_insert_own" on public.clubs;
drop policy if exists "clubs_update_admin" on public.clubs;

-- Create corrected policies
create policy "clubs_insert_own" on public.clubs 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "clubs_update_admin" on public.clubs 
  for update to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    ) or 
    exists (
      select 1 from public.club_members cm
      join public.users u on u.id = cm.user_id
      where cm.club_id = clubs.id 
      and u.auth_id = (select auth.uid())
      and cm.role in ('admin', 'moderator')
    )
  );

-- =======================
-- 2) FIX CLUB_MEMBERS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "club_members_insert_own" on public.club_members;
drop policy if exists "club_members_delete_own_or_admin" on public.club_members;

-- Create corrected policies
create policy "club_members_insert_own" on public.club_members 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "club_members_delete_own_or_admin" on public.club_members 
  for delete to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    ) or 
    exists (
      select 1 from public.club_members cm
      join public.users u on u.id = cm.user_id
      where cm.club_id = club_members.club_id 
      and u.auth_id = (select auth.uid())
      and cm.role = 'admin'
    )
  );

-- =======================
-- 3) FIX CLUB_MESSAGES RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "club_messages_insert_members" on public.club_messages;

-- Create corrected policy
create policy "club_messages_insert_members" on public.club_messages 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    ) and 
    exists (
      select 1 from public.club_members cm
      join public.users u on u.id = cm.user_id
      where cm.club_id = club_messages.club_id 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 4) FIX EVENTS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_creator" on public.events;

-- Create corrected policies
create policy "events_insert_own" on public.events 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "events_update_creator" on public.events 
  for update to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 5) FIX EVENT_RSVPS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "event_rsvps_insert_own" on public.event_rsvps;
drop policy if exists "event_rsvps_update_own" on public.event_rsvps;

-- Create corrected policies
create policy "event_rsvps_insert_own" on public.event_rsvps 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "event_rsvps_update_own" on public.event_rsvps 
  for update to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 6) FIX STUDY_GROUPS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "study_groups_insert_own" on public.study_groups;

-- Create corrected policy
create policy "study_groups_insert_own" on public.study_groups 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 7) FIX SHARED_NOTES RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "shared_notes_insert_own" on public.shared_notes;

-- Create corrected policy
create policy "shared_notes_insert_own" on public.shared_notes 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 8) FIX USER_REPUTATION RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "user_reputation_insert_own" on public.user_reputation;

-- Create corrected policy
create policy "user_reputation_insert_own" on public.user_reputation 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 9) FIX USER_REWARDS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "user_rewards_insert_own" on public.user_rewards;

-- Create corrected policy
create policy "user_rewards_insert_own" on public.user_rewards 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = user_id 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 10) FIX COLLABORATION_TOOLS RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "collaboration_tools_insert_own" on public.collaboration_tools;
drop policy if exists "collaboration_tools_update_own" on public.collaboration_tools;
drop policy if exists "collaboration_tools_delete_own" on public.collaboration_tools;

-- Create corrected policies
create policy "collaboration_tools_insert_own" on public.collaboration_tools 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "collaboration_tools_update_own" on public.collaboration_tools 
  for update to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "collaboration_tools_delete_own" on public.collaboration_tools 
  for delete to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = created_by 
      and u.auth_id = (select auth.uid())
    )
  );

-- =======================
-- 11) FIX COLLABORATION_TOOL_SHARES RLS POLICIES
-- =======================

-- Drop existing policies
drop policy if exists "collaboration_tool_shares_insert_own" on public.collaboration_tool_shares;
drop policy if exists "collaboration_tool_shares_delete_own" on public.collaboration_tool_shares;

-- Create corrected policies
create policy "collaboration_tool_shares_insert_own" on public.collaboration_tool_shares 
  for insert to authenticated 
  with check (
    exists (
      select 1 from public.users u 
      where u.id = shared_by 
      and u.auth_id = (select auth.uid())
    )
  );

create policy "collaboration_tool_shares_delete_own" on public.collaboration_tool_shares 
  for delete to authenticated 
  using (
    exists (
      select 1 from public.users u 
      where u.id = shared_by 
      and u.auth_id = (select auth.uid())
    )
  );