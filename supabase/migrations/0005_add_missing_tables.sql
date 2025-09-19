-- Migration: Add missing tables referenced in API routes
-- This migration adds notifications, user_reputation, and collaboration_tools tables

-- =======================
-- 1) NOTIFICATIONS TABLE
-- =======================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info', -- 'info', 'success', 'warning', 'error'
  read boolean not null default false,
  action_url text,
  reference_id uuid, -- Can reference any related entity
  reference_type text, -- 'club', 'event', 'message', 'collaboration_tool', etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Indexes
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_created_at on public.notifications(created_at);
create index if not exists idx_notifications_type on public.notifications(type);

-- RLS Policies
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_insert_system" on public.notifications
  for insert to service_role
  with check (true);

-- =======================
-- 2) USER_REPUTATION TABLE
-- =======================
create table if not exists public.user_reputation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  total_xp integer not null default 0,
  level integer not null default 1,
  rank_position integer,
  badges text[] default '{}',
  achievements_count integer not null default 0,
  clubs_joined integer not null default 0,
  events_attended integer not null default 0,
  notes_shared integer not null default 0,
  helpful_votes integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Enable RLS
alter table public.user_reputation enable row level security;

-- Indexes
create index if not exists idx_user_reputation_user_id on public.user_reputation(user_id);
create index if not exists idx_user_reputation_total_xp on public.user_reputation(total_xp desc);
create index if not exists idx_user_reputation_level on public.user_reputation(level desc);
create index if not exists idx_user_reputation_rank_position on public.user_reputation(rank_position);

-- RLS Policies
create policy "user_reputation_select_all" on public.user_reputation
  for select to authenticated
  using (true);

create policy "user_reputation_insert_own" on public.user_reputation
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_reputation_update_system" on public.user_reputation
  for update to service_role
  using (true)
  with check (true);

-- =======================
-- 3) COLLABORATION_TOOLS TABLE
-- =======================
create table if not exists public.collaboration_tools (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null, -- 'document', 'whiteboard', 'quiz', 'poll', 'presentation'
  content jsonb not null default '{}',
  tags text[] default '{}',
  is_public boolean default false,
  is_template boolean default false,
  template_category text,
  access_level text not null default 'private', -- 'private', 'club', 'public'
  created_by uuid not null references public.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  study_group_id uuid references public.study_groups(id) on delete set null,
  shared_with uuid[] default '{}', -- Array of user IDs who have access
  view_count integer not null default 0,
  like_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.collaboration_tools enable row level security;

-- Indexes
create index if not exists idx_collaboration_tools_created_by on public.collaboration_tools(created_by);
create index if not exists idx_collaboration_tools_type on public.collaboration_tools(type);
create index if not exists idx_collaboration_tools_club_id on public.collaboration_tools(club_id);
create index if not exists idx_collaboration_tools_study_group_id on public.collaboration_tools(study_group_id);
create index if not exists idx_collaboration_tools_tags on public.collaboration_tools using gin(tags);
create index if not exists idx_collaboration_tools_is_public on public.collaboration_tools(is_public);
create index if not exists idx_collaboration_tools_created_at on public.collaboration_tools(created_at);

-- RLS Policies
create policy "collaboration_tools_select_accessible" on public.collaboration_tools
  for select to authenticated
  using (
    is_public = true or
    created_by = (select auth.uid()) or
    (select auth.uid()) = any(shared_with) or
    (club_id is not null and exists (
      select 1 from public.club_members 
      where club_id = collaboration_tools.club_id 
      and user_id = (select auth.uid())
    )) or
    (study_group_id is not null and exists (
      select 1 from public.study_group_members 
      where group_id = collaboration_tools.study_group_id 
      and user_id = (select auth.uid())
    ))
  );

create policy "collaboration_tools_insert_own" on public.collaboration_tools
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "collaboration_tools_update_own" on public.collaboration_tools
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "collaboration_tools_delete_own" on public.collaboration_tools
  for delete to authenticated
  using (created_by = (select auth.uid()));

-- =======================
-- 4) COLLABORATION_TOOL_SHARES TABLE
-- =======================
create table if not exists public.collaboration_tool_shares (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.collaboration_tools(id) on delete cascade,
  shared_by uuid not null references public.users(id) on delete cascade,
  shared_with uuid not null references public.users(id) on delete cascade,
  permission_level text not null default 'view', -- 'view', 'edit', 'admin'
  created_at timestamptz default now(),
  unique(tool_id, shared_with)
);

-- Enable RLS
alter table public.collaboration_tool_shares enable row level security;

-- Indexes
create index if not exists idx_collaboration_tool_shares_tool_id on public.collaboration_tool_shares(tool_id);
create index if not exists idx_collaboration_tool_shares_shared_with on public.collaboration_tool_shares(shared_with);

-- RLS Policies
create policy "collaboration_tool_shares_select_involved" on public.collaboration_tool_shares
  for select to authenticated
  using (shared_by = (select auth.uid()) or shared_with = (select auth.uid()));

create policy "collaboration_tool_shares_insert_own" on public.collaboration_tool_shares
  for insert to authenticated
  with check (shared_by = (select auth.uid()));

create policy "collaboration_tool_shares_delete_own" on public.collaboration_tool_shares
  for delete to authenticated
  using (shared_by = (select auth.uid()));

-- =======================
-- 5) FUNCTIONS & TRIGGERS
-- =======================

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_notifications_updated_at 
  before update on public.notifications 
  for each row execute function public.update_updated_at_column();

create trigger update_user_reputation_updated_at 
  before update on public.user_reputation 
  for each row execute function public.update_updated_at_column();

create trigger update_collaboration_tools_updated_at 
  before update on public.collaboration_tools 
  for each row execute function public.update_updated_at_column();

-- Function to initialize user reputation when user is created
create or replace function public.initialize_user_reputation()
returns trigger as $$
begin
  insert into public.user_reputation (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to initialize reputation for new users
create trigger initialize_reputation_on_user_creation
  after insert on public.users
  for each row execute function public.initialize_user_reputation();

-- Function to update user reputation based on campus XP
create or replace function public.update_user_reputation_from_xp()
returns trigger as $$
declare
  total_xp integer;
  new_level integer;
begin
  -- Calculate total XP for the user
  select coalesce(sum(points), 0) into total_xp
  from public.campus_xp
  where user_id = new.user_id;
  
  -- Calculate level (every 100 XP = 1 level)
  new_level := greatest(1, total_xp / 100 + 1);
  
  -- Update user reputation
  update public.user_reputation
  set 
    total_xp = total_xp,
    level = new_level,
    updated_at = now()
  where user_id = new.user_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to update reputation when XP is awarded
create trigger update_reputation_on_xp_change
  after insert on public.campus_xp
  for each row execute function public.update_user_reputation_from_xp();

-- Function to update collaboration tool view count
create or replace function public.increment_tool_view_count(tool_id uuid)
returns void as $$
begin
  update public.collaboration_tools
  set view_count = view_count + 1
  where id = tool_id;
end;
$$ language plpgsql security definer;