import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/nfts -> list user's NFTs
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/nfts -> mint NFT (stub) and insert record
// Expected body: { mint_address: string; metadata_url?: string; description?: string }
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json()
    const mint_address: string | undefined = body?.mint_address
    const metadata_url: string | undefined = body?.metadata_url
    const description: string | undefined = body?.description

    if (!mint_address) return NextResponse.json({ error: 'mint_address is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('nfts')
      .insert({ user_id: userRowId, mint_address, metadata_url: metadata_url || null, description: description || null })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}