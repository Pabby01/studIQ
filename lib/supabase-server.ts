import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase helpers
// - getSupabaseAdmin(): uses SERVICE_ROLE for privileged operations (bypasses RLS). DO NOT expose client-side.
// - getSupabaseFromRequest(req): binds the user's auth token from the request if present.

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getSupabaseFromRequest(req: Request): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
  if (!url || !anonKey) return null
  const authHeader = req.headers.get('authorization') || ''
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

export async function resolveUserRowId(params: {
  supabase: SupabaseClient
  userId?: string | null
  authId?: string | null
}): Promise<string | null> {
  const { supabase, userId, authId } = params
  if (userId) return userId
  if (!authId) return null

  // Try to find existing row
  const { data: found, error: findErr } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()

  if (found?.id) return found.id

  // Not found: attempt to auto-provision using admin client
  const admin = getSupabaseAdmin()
  if (!admin) return null

  // Get auth user to derive email/username
  const { data: authData } = await supabase.auth.getUser()
  const email = authData?.user?.email || `${authId}@local.invalid`
  const baseUsername = (authData?.user?.user_metadata as any)?.username || (email.split('@')[0] || `user_${authId.slice(0, 8)}`)

  // Attempt insert with a couple of username variants to avoid unique collisions
  const candidates = [
    baseUsername,
    `${baseUsername}_${authId.slice(0, 6)}`,
    `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`,
  ]

  for (const username of candidates) {
    const { data: inserted, error: insErr } = await admin
      .from('users')
      .insert({ auth_id: authId, username, email })
      .select('id')
      .single()

    if (inserted?.id) return inserted.id

    // If unique violation, try next candidate; otherwise, break
    const msg = String(insErr?.message || '')
    if (!/duplicate key|unique constraint/i.test(msg)) break
  }

  // Last attempt: re-query in case trigger created it concurrently
  const { data: again } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()

  return again?.id || null
}