-- StudIQ Supabase schema (tables, indexes, RLS, and auth trigger)
-- This file is safe to run multiple times (guards use IF NOT EXISTS where possible)

-- Install extension in the dedicated schema
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- =======================
-- 1) USERS
-- =======================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid (),
  auth_id uuid references auth.users (id) on delete cascade,
  username text unique not null,
  email text unique not null,
  avatar_url text,
  bio text,
  preferences jsonb,
  created_at timestamptz default now(),
  constraint users_auth_id_unique unique (auth_id)
);

alter table public.users enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'users_select_own') then
    create policy "users_select_own" on public.users
      for select
      to authenticated
      using ((SELECT auth.uid()) = auth_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users_insert_self') then
    create policy "users_insert_self" on public.users
      for insert
      to authenticated
      with check ((SELECT auth.uid()) = auth_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users_update_own') then
    create policy "users_update_own" on public.users
      for update
      to authenticated
      using ((SELECT auth.uid()) = auth_id)
      with check ((SELECT auth.uid()) = auth_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users_delete_own') then
    create policy "users_delete_own" on public.users
      for delete
      to authenticated
      using ((SELECT auth.uid()) = auth_id);
  end if;
end;
$$;

-- Indexes
create index if not exists idx_users_auth_id on public.users (auth_id);

create index if not exists idx_users_created_at on public.users (created_at);

-- Trigger to auto-provision a public.users row when a new auth.users row is created
create or replace function public.handle_new_user () returns trigger as $$
begin
  insert into public.users (auth_id, username, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), new.email)
  on conflict (auth_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger if it does not exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

-- =======================
-- 2) COURSE MATERIALS
-- =======================
create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  file_url text not null,
  summary text,
  quiz jsonb,
  progress int default 0 check (progress between 0 and 100),
  created_at timestamptz default now()
);

alter table public.course_materials enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'materials_select_own') then
    create policy "materials_select_own" on public.course_materials
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = course_materials.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'materials_insert_own') then
    create policy "materials_insert_own" on public.course_materials
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
  if not exists (select 1 from pg_policy where polname = 'materials_update_own') then
    create policy "materials_update_own" on public.course_materials
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = course_materials.user_id
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
  if not exists (select 1 from pg_policy where polname = 'materials_delete_own') then
    create policy "materials_delete_own" on public.course_materials
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = course_materials.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
end;
$$;

-- Indexes
create index if not exists idx_course_materials_user_id on public.course_materials (user_id);

create index if not exists idx_course_materials_created_at on public.course_materials (created_at);

-- =======================
-- 3) FINANCE PLANS
-- =======================
create table if not exists public.finance_plans (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  income numeric(12, 2) not null default 0,
  expenses numeric(12, 2) not null default 0,
  savings_goal numeric(12, 2) default 0,
  ai_advice text,
  created_at timestamptz default now()
);

alter table public.finance_plans enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'finance_select_own') then
    create policy "finance_select_own" on public.finance_plans
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = finance_plans.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'finance_insert_own') then
    create policy "finance_insert_own" on public.finance_plans
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
  if not exists (select 1 from pg_policy where polname = 'finance_update_own') then
    create policy "finance_update_own" on public.finance_plans
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = finance_plans.user_id
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
  if not exists (select 1 from pg_policy where polname = 'finance_delete_own') then
    create policy "finance_delete_own" on public.finance_plans
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = finance_plans.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
end;
$$;

-- Indexes
create index if not exists idx_finance_plans_user_id on public.finance_plans (user_id);

create index if not exists idx_finance_plans_created_at on public.finance_plans (created_at);

-- =======================
-- 4) WALLETS
-- =======================
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  public_key text not null,
  balance numeric(20, 8) not null default 0,
  created_at timestamptz default now(),
  constraint wallets_user_pubkey_unique unique (user_id, public_key)
);

alter table public.wallets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'wallets_select_own') then
    create policy "wallets_select_own" on public.wallets
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = wallets.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'wallets_insert_own') then
    create policy "wallets_insert_own" on public.wallets
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
  if not exists (select 1 from pg_policy where polname = 'wallets_update_own') then
    create policy "wallets_update_own" on public.wallets
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = wallets.user_id
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
  if not exists (select 1 from pg_policy where polname = 'wallets_delete_own') then
    create policy "wallets_delete_own" on public.wallets
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = wallets.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
end;
$$;

-- Indexes
create index if not exists idx_wallets_user_id on public.wallets (user_id);

create index if not exists idx_wallets_created_at on public.wallets (created_at);

create index if not exists idx_wallets_public_key on public.wallets (public_key);

-- =======================
-- 5) TRANSACTIONS
-- =======================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  tx_hash text unique,
  amount numeric(20, 8) not null,
  tx_type text not null check (tx_type in ('send', 'receive')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'tx_select_own') then
    create policy "tx_select_own" on public.transactions
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = transactions.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'tx_insert_own') then
    create policy "tx_insert_own" on public.transactions
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
  if not exists (select 1 from pg_policy where polname = 'tx_update_own') then
    create policy "tx_update_own" on public.transactions
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = transactions.user_id
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
  if not exists (select 1 from pg_policy where polname = 'tx_delete_own') then
    create policy "tx_delete_own" on public.transactions
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = transactions.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
end;
$$;

-- Indexes
create index if not exists idx_transactions_user_id on public.transactions (user_id);

create index if not exists idx_transactions_wallet_id on public.transactions (wallet_id);

create index if not exists idx_transactions_created_at on public.transactions (created_at);

create index if not exists idx_transactions_tx_hash on public.transactions (tx_hash);

-- =======================
-- 6) NFTS
-- =======================
create table if not exists public.nfts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  mint_address text unique not null,
  metadata_url text,
  description text,
  created_at timestamptz default now()
);

alter table public.nfts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'nfts_select_own') then
    create policy "nfts_select_own" on public.nfts
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = nfts.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'nfts_insert_own') then
    create policy "nfts_insert_own" on public.nfts
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
  if not exists (select 1 from pg_policy where polname = 'nfts_update_own') then
    create policy "nfts_update_own" on public.nfts
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = nfts.user_id
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
  if not exists (select 1 from pg_policy where polname = 'nfts_delete_own') then
    create policy "nfts_delete_own" on public.nfts
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = nfts.user_id
            and u.auth_id = (SELECT auth.uid())
        )
      );
  end if;
end;
$$;

-- Indexes
create index if not exists idx_nfts_user_id on public.nfts (user_id);

create index if not exists idx_nfts_created_at on public.nfts (created_at);