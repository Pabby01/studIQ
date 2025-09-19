-- Campus Hub Schema Migration
-- Adds tables for clubs, events, collaboration tools, and reputation system

-- =======================
-- 1) CLUBS & COMMUNITIES
-- =======================

-- Clubs table
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null, -- 'academic', 'sports', 'arts', 'technology', 'social', etc.
  avatar_url text,
  banner_url text,
  is_private boolean default false,
  max_members integer default 500,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Club members table
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member', -- 'admin', 'moderator', 'member'
  joined_at timestamptz default now(),
  unique(club_id, user_id)
);

-- Club messages for real-time chat
create table if not exists public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  message_type text default 'text', -- 'text', 'image', 'file', 'system'
  reply_to uuid references public.club_messages(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =======================
-- 2) EVENTS & MEETUPS
-- =======================

-- Events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null, -- 'career_fair', 'hackathon', 'study_session', 'social', 'workshop'
  location text,
  virtual_link text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  max_attendees integer,
  requires_rsvp boolean default true,
  nft_ticket_enabled boolean default false,
  nft_collection_address text,
  created_by uuid not null references public.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Event RSVPs
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'going', -- 'going', 'maybe', 'not_going'
  nft_ticket_minted boolean default false,
  nft_token_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, user_id)
);

-- =======================
-- 3) COLLABORATION TOOLS
-- =======================

-- Study groups
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  subject text not null,
  max_members integer default 10,
  is_private boolean default false,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Study group members
create table if not exists public.study_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member', -- 'admin', 'member'
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Shared notes
create table if not exists public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  subject text,
  tags text[],
  is_public boolean default false,
  created_by uuid not null references public.users(id) on delete cascade,
  study_group_id uuid references public.study_groups(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Flashcards
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text,
  tags text[],
  cards jsonb not null, -- Array of {front: string, back: string, difficulty?: number}
  is_public boolean default false,
  created_by uuid not null references public.users(id) on delete cascade,
  study_group_id uuid references public.study_groups(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Study packs (AI-generated collections)
create table if not exists public.study_packs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text not null,
  difficulty_level text default 'intermediate', -- 'beginner', 'intermediate', 'advanced'
  content jsonb not null, -- Contains notes, flashcards, quizzes, etc.
  ai_generated boolean default false,
  source_materials uuid[], -- References to notes, materials that were used
  created_by uuid not null references public.users(id) on delete cascade,
  study_group_id uuid references public.study_groups(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =======================
-- 4) REPUTATION SYSTEM
-- =======================

-- Campus XP tracking
create table if not exists public.campus_xp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action_type text not null, -- 'club_join', 'event_attend', 'note_share', 'help_peer', etc.
  points integer not null,
  description text,
  reference_id uuid, -- Can reference club_id, event_id, note_id, etc.
  reference_type text, -- 'club', 'event', 'note', 'message', etc.
  created_at timestamptz default now()
);

-- User achievements/badges
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_type text not null, -- 'first_club', 'event_organizer', 'helpful_peer', etc.
  title text not null,
  description text,
  icon_url text,
  nft_address text, -- If achievement is minted as NFT
  earned_at timestamptz default now()
);

-- Rewards catalog
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cost_xp integer not null,
  reward_type text not null, -- 'nft', 'discount', 'access', 'merchandise'
  reward_data jsonb, -- Contains specific reward details
  is_active boolean default true,
  created_at timestamptz default now()
);

-- User reward redemptions
create table if not exists public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  status text not null default 'pending', -- 'pending', 'fulfilled', 'expired'
  redeemed_at timestamptz default now(),
  fulfilled_at timestamptz
);

-- =======================
-- 5) INDEXES
-- =======================

-- Clubs indexes
create index if not exists idx_clubs_category on public.clubs(category);
create index if not exists idx_clubs_created_by on public.clubs(created_by);
create index if not exists idx_club_members_club_id on public.club_members(club_id);
create index if not exists idx_club_members_user_id on public.club_members(user_id);
create index if not exists idx_club_messages_club_id on public.club_messages(club_id);
create index if not exists idx_club_messages_created_at on public.club_messages(created_at);

-- Events indexes
create index if not exists idx_events_start_time on public.events(start_time);
create index if not exists idx_events_event_type on public.events(event_type);
create index if not exists idx_events_club_id on public.events(club_id);
create index if not exists idx_event_rsvps_event_id on public.event_rsvps(event_id);
create index if not exists idx_event_rsvps_user_id on public.event_rsvps(user_id);

-- Collaboration indexes
create index if not exists idx_study_groups_subject on public.study_groups(subject);
create index if not exists idx_shared_notes_subject on public.shared_notes(subject);
create index if not exists idx_shared_notes_tags on public.shared_notes using gin(tags);
create index if not exists idx_flashcards_subject on public.flashcards(subject);
create index if not exists idx_flashcards_tags on public.flashcards using gin(tags);

-- Reputation indexes
create index if not exists idx_campus_xp_user_id on public.campus_xp(user_id);
create index if not exists idx_campus_xp_action_type on public.campus_xp(action_type);
create index if not exists idx_user_achievements_user_id on public.user_achievements(user_id);

-- =======================
-- 6) ROW LEVEL SECURITY
-- =======================

-- Enable RLS on all tables
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_messages enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.shared_notes enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_packs enable row level security;
alter table public.campus_xp enable row level security;
alter table public.user_achievements enable row level security;
alter table public.rewards enable row level security;
alter table public.user_rewards enable row level security;

-- Clubs policies
create policy "clubs_select_all" on public.clubs for select to authenticated using (true);
create policy "clubs_insert_own" on public.clubs for insert to authenticated with check (created_by = (select auth.uid()));
create policy "clubs_update_admin" on public.clubs for update to authenticated using (
  created_by = (select auth.uid()) or 
  exists (select 1 from public.club_members where club_id = id and user_id = (select auth.uid()) and role in ('admin', 'moderator'))
);

-- Club members policies
create policy "club_members_select_all" on public.club_members for select to authenticated using (true);
create policy "club_members_insert_own" on public.club_members for insert to authenticated with check (user_id = (select auth.uid()));
create policy "club_members_delete_own_or_admin" on public.club_members for delete to authenticated using (
  user_id = (select auth.uid()) or 
  exists (select 1 from public.club_members cm where cm.club_id = club_id and cm.user_id = (select auth.uid()) and cm.role = 'admin')
);

-- Club messages policies
create policy "club_messages_select_members" on public.club_messages for select to authenticated using (
  exists (select 1 from public.club_members where club_id = club_messages.club_id and user_id = (select auth.uid()))
);
create policy "club_messages_insert_members" on public.club_messages for insert to authenticated with check (
  user_id = (select auth.uid()) and 
  exists (select 1 from public.club_members where club_id = club_messages.club_id and user_id = (select auth.uid()))
);

-- Events policies
create policy "events_select_all" on public.events for select to authenticated using (true);
create policy "events_insert_own" on public.events for insert to authenticated with check (created_by = (select auth.uid()));
create policy "events_update_creator" on public.events for update to authenticated using (created_by = (select auth.uid()));

-- Event RSVPs policies
create policy "event_rsvps_select_all" on public.event_rsvps for select to authenticated using (true);
create policy "event_rsvps_insert_own" on public.event_rsvps for insert to authenticated with check (user_id = (select auth.uid()));
create policy "event_rsvps_update_own" on public.event_rsvps for update to authenticated using (user_id = (select auth.uid()));

-- Study groups policies
create policy "study_groups_select_all" on public.study_groups for select to authenticated using (true);
create policy "study_groups_insert_own" on public.study_groups for insert to authenticated with check (created_by = (select auth.uid()));

-- Shared notes policies
create policy "shared_notes_select_public_or_member" on public.shared_notes for select to authenticated using (
  is_public = true or 
  created_by = (select auth.uid()) or
  (study_group_id is not null and exists (select 1 from public.study_group_members where group_id = study_group_id and user_id = (select auth.uid()))) or
  (club_id is not null and exists (select 1 from public.club_members where club_id = shared_notes.club_id and user_id = (select auth.uid())))
);
create policy "shared_notes_insert_own" on public.shared_notes for insert to authenticated with check (created_by = (select auth.uid()));

-- Campus XP policies
create policy "campus_xp_select_own" on public.campus_xp for select to authenticated using (user_id = (select auth.uid()));
create policy "campus_xp_insert_system" on public.campus_xp for insert to service_role with check (true);

-- User achievements policies
create policy "user_achievements_select_own" on public.user_achievements for select to authenticated using (user_id = (select auth.uid()));
create policy "user_achievements_insert_system" on public.user_achievements for insert to service_role with check (true);

-- Rewards policies
create policy "rewards_select_all" on public.rewards for select to authenticated using (is_active = true);

-- User rewards policies
create policy "user_rewards_select_own" on public.user_rewards for select to authenticated using (user_id = (select auth.uid()));
create policy "user_rewards_insert_own" on public.user_rewards for insert to authenticated with check (user_id = (select auth.uid()));

-- =======================
-- 7) FUNCTIONS & TRIGGERS
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
create trigger update_clubs_updated_at before update on public.clubs for each row execute function public.update_updated_at_column();
create trigger update_club_messages_updated_at before update on public.club_messages for each row execute function public.update_updated_at_column();
create trigger update_events_updated_at before update on public.events for each row execute function public.update_updated_at_column();
create trigger update_event_rsvps_updated_at before update on public.event_rsvps for each row execute function public.update_updated_at_column();
create trigger update_study_groups_updated_at before update on public.study_groups for each row execute function public.update_updated_at_column();
create trigger update_shared_notes_updated_at before update on public.shared_notes for each row execute function public.update_updated_at_column();
create trigger update_flashcards_updated_at before update on public.flashcards for each row execute function public.update_updated_at_column();
create trigger update_study_packs_updated_at before update on public.study_packs for each row execute function public.update_updated_at_column();

-- Function to award XP for various actions
create or replace function public.award_campus_xp(
  p_user_id uuid,
  p_action_type text,
  p_points integer,
  p_description text default null,
  p_reference_id uuid default null,
  p_reference_type text default null
)
returns void as $$
begin
  insert into public.campus_xp (user_id, action_type, points, description, reference_id, reference_type)
  values (p_user_id, p_action_type, p_points, p_description, p_reference_id, p_reference_type);
end;
$$ language plpgsql security definer;

-- Function to get user's total XP
create or replace function public.get_user_total_xp(p_user_id uuid)
returns integer as $$
declare
  total_xp integer;
begin
  select coalesce(sum(points), 0) into total_xp
  from public.campus_xp
  where user_id = p_user_id;
  
  return total_xp;
end;
$$ language plpgsql security definer;

-- Trigger to award XP for joining clubs
create or replace function public.award_xp_club_join()
returns trigger as $$
begin
  perform public.award_campus_xp(
    new.user_id,
    'club_join',
    10,
    'Joined a club',
    new.club_id,
    'club'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger award_xp_on_club_join
  after insert on public.club_members
  for each row execute function public.award_xp_club_join();

-- Trigger to award XP for event RSVPs
create or replace function public.award_xp_event_rsvp()
returns trigger as $$
begin
  if new.status = 'going' then
    perform public.award_campus_xp(
      new.user_id,
      'event_rsvp',
      5,
      'RSVP to an event',
      new.event_id,
      'event'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger award_xp_on_event_rsvp
  after insert on public.event_rsvps
  for each row execute function public.award_xp_event_rsvp();