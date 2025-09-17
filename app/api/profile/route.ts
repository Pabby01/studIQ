import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/profile -> return current user's profile row from public.users
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { data, error } = await supabase
      .from('users')
      .select('id, auth_id, username, email, avatar_url, bio, preferences')
      .eq('id', userRowId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ profile: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// PATCH /api/profile -> update current user's profile fields
// Body: { username?, avatar_url?, bio?, preferences? (object), display_name? (maps to preferences.display_name) }
export async function PATCH(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const body = await req.json().catch(() => ({}))

    const update: any = {}
    if (typeof body.username === 'string') update.username = body.username.trim()
    if (typeof body.avatar_url === 'string') update.avatar_url = body.avatar_url
    if (typeof body.bio === 'string') update.bio = body.bio

    // Merge preferences if provided
    if (body && typeof body.preferences === 'object' && body.preferences !== null) {
      // Load current preferences to merge
      const { data: curr } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userRowId)
        .single()
      const merged = { ...(curr?.preferences || {}), ...body.preferences }
      update.preferences = merged
    }

    // Map display_name to preferences.display_name for convenience
    if (typeof body.display_name === 'string') {
      const { data: curr } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userRowId)
        .single()
      const currPrefs = curr?.preferences || {}
      update.preferences = { ...currPrefs, display_name: body.display_name }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userRowId)
      .select('id, auth_id, username, email, avatar_url, bio, preferences')
      .single()

    if (error) {
      const msg = String(error.message || '')
      if (/duplicate key|unique constraint|unique/i.test(msg)) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ profile: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}