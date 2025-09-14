import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/finance -> list current user's finance plans
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { data, error } = await supabase
      .from('finance_plans')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/finance -> create a plan with basic AI advice (stub)
// Expected body: { income: number; expenses: number; savings_goal?: number }
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json()
    const income = Number(body?.income ?? 0)
    const expenses = Number(body?.expenses ?? 0)
    const savings_goal = body?.savings_goal != null ? Number(body?.savings_goal) : 0

    if (Number.isNaN(income) || Number.isNaN(expenses)) {
      return NextResponse.json({ error: 'income and expenses must be numbers' }, { status: 400 })
    }

    // Simple AI advice stub
    const ratio = income > 0 ? (expenses / income) : 0
    let ai_advice: string
    if (income <= 0) {
      ai_advice = 'No income provided. Consider tracking income sources and setting a minimum monthly target.'
    } else if (ratio > 0.8) {
      ai_advice = 'Your expenses are high relative to income. Cut 10-15% in non-essentials and set automated savings.'
    } else if (ratio > 0.5) {
      ai_advice = 'Expense-to-income is moderate. Optimize recurring bills and negotiate student discounts.'
    } else {
      ai_advice = 'Great job! Reallocate surplus to savings and emergency fund; consider staking stable assets.'
    }

    const { data, error } = await supabase
      .from('finance_plans')
      .insert({ user_id: userRowId, income, expenses, savings_goal, ai_advice })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}