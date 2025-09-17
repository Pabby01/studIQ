import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/savings-goals -> list current user's savings goals
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/savings-goals -> create a new savings goal
// Expected body: { name: string; target_amount: number; current_amount?: number; deadline: string; reminder_enabled?: boolean }
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json()
    const name: string | undefined = body?.name
    const target_amount = Number(body?.target_amount)
    const current_amount = Number(body?.current_amount ?? 0)
    const deadline: string | undefined = body?.deadline
    const reminder_enabled = Boolean(body?.reminder_enabled ?? true)

    if (!name || Number.isNaN(target_amount) || target_amount <= 0) {
      return NextResponse.json({ error: 'name and target_amount are required' }, { status: 400 })
    }

    if (!deadline) {
      return NextResponse.json({ error: 'deadline is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ 
        user_id: userRowId, 
        name, 
        target_amount, 
        current_amount, 
        deadline, 
        reminder_enabled 
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// PUT /api/savings-goals -> update a savings goal (for adding money to current_amount)
export async function PUT(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json()
    const id: string | undefined = body?.id
    const current_amount = Number(body?.current_amount)

    if (!id || Number.isNaN(current_amount)) {
      return NextResponse.json({ error: 'id and current_amount are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('savings_goals')
      .update({ current_amount })
      .eq('id', id)
      .eq('user_id', userRowId)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: data }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}