-- Add savings_goals table to support the savings goals feature
-- This table is separate from finance_plans to allow multiple savings goals per user

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0,
  deadline timestamptz not null,
  reminder_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.savings_goals enable row level security;

-- RLS policies
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'savings_goals_select_own') then
    create policy "savings_goals_select_own" on public.savings_goals
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = savings_goals.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'savings_goals_insert_own') then
    create policy "savings_goals_insert_own" on public.savings_goals
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.users u
          where u.id = user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'savings_goals_update_own') then
    create policy "savings_goals_update_own" on public.savings_goals
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = savings_goals.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.users u
          where u.id = user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'savings_goals_delete_own') then
    create policy "savings_goals_delete_own" on public.savings_goals
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = savings_goals.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
end;
$$;

-- Indexes
create index if not exists idx_savings_goals_user_id on public.savings_goals (user_id);
create index if not exists idx_savings_goals_created_at on public.savings_goals (created_at);
create index if not exists idx_savings_goals_deadline on public.savings_goals (deadline);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_savings_goals_updated_at'
  ) then
    create trigger update_savings_goals_updated_at
      before update on public.savings_goals
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;