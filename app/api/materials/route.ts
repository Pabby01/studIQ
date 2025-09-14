import { NextResponse } from 'next/server'
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server'

// GET /api/materials -> list current user's course materials
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) {
      return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/materials -> upload/process materials (stub processing) and insert row
// Expected body: { title: string; fileUrl?: string; textContent?: string }
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req)
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id })
    if (!userRowId) {
      return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })
    }

    const body = await req.json()
    const title: string | undefined = body?.title
    const fileUrl: string | undefined = body?.fileUrl
    const textContent: string | undefined = body?.textContent

    if (!title && !fileUrl && !textContent) {
      return NextResponse.json({ error: 'Provide at least title, fileUrl, or textContent' }, { status: 400 })
    }

    // Simple stub processing
    const summary = textContent
      ? (textContent.length > 240 ? textContent.slice(0, 240) + '…' : textContent)
      : (title ? `Summary for: ${title}` : null)

    const quiz = textContent || title
      ? [
          { q: 'What is the main topic?', a: '...' },
          { q: 'List two key points.', a: '...' },
          { q: 'Explain a core concept in your own words.', a: '...' },
        ]
      : null

    const insertPayload: any = {
      user_id: userRowId,
      title: title || 'Untitled Material',
      file_url: fileUrl || null,
      summary: summary,
      quiz: quiz ? JSON.stringify(quiz) : null,
    }

    const { data, error } = await supabase
      .from('course_materials')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}