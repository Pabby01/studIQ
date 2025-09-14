import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/wallets -> list user's wallets with balances
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/wallets -> create a wallet record (stub for on-chain creation)
// Expected body: { public_key: string }
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json()
    const public_key: string | undefined = body?.public_key
    if (!public_key) return NextResponse.json({ error: 'public_key is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('wallets')
      .insert({ user_id: userRowId, public_key })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}