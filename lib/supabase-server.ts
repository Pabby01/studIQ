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
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !data) return null
  return data.id
}