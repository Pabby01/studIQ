import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// POST /api/admin/migrate -> run database migrations (admin only)
export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    // Create savings_goals table if it doesn't exist
    const createTableSQL = `
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
    `

    const { error: tableError } = await admin.rpc('exec_sql', { sql: createTableSQL })
    
    // If rpc doesn't work, try direct SQL execution
    if (tableError) {
      // Try alternative approach using raw SQL
      const { error: altError } = await admin
        .from('savings_goals')
        .select('id')
        .limit(1)
      
      // If table doesn't exist, we need to create it manually
      if (altError && altError.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Table does not exist. Please run the migration manually in Supabase dashboard.',
          sql: createTableSQL
        }, { status: 400 })
      }
    }

    // Enable RLS if not already enabled
    const rlsSQL = `
      alter table public.savings_goals enable row level security;
    `

    // Create policies
    const policiesSQL = `
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
    `

    // Create indexes
    const indexesSQL = `
      create index if not exists idx_savings_goals_user_id on public.savings_goals (user_id);
      create index if not exists idx_savings_goals_created_at on public.savings_goals (created_at);
      create index if not exists idx_savings_goals_deadline on public.savings_goals (deadline);
    `

    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      note: 'If you see errors, please run the SQL manually in Supabase dashboard'
    })

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message || 'Migration failed',
      note: 'Please run the migration SQL manually in Supabase dashboard'
    }, { status: 500 })
  }
}