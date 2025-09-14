import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/transactions -> list user's transactions
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/transactions -> send tokens (stub) and insert tx record
// Expected body: { wallet_id: string; amount: number; tx_type: 'send'|'receive'; tx_hash?: string }
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json()
    const wallet_id: string | undefined = body?.wallet_id
    const amount = Number(body?.amount)
    const tx_type = body?.tx_type === 'receive' ? 'receive' : 'send'
    const tx_hash: string | null = body?.tx_hash || null

    if (!wallet_id || Number.isNaN(amount)) {
      return NextResponse.json({ error: 'wallet_id and amount are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({ user_id: userRowId, wallet_id, amount, tx_type, tx_hash, status: 'pending' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}