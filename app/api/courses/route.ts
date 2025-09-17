import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server';

// GET /api/courses -> synthesize recent courses from course_materials summaries
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });

    const { data, error } = await supabase
      .from('course_materials')
      .select('id, title, progress, created_at')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const items = (data || []).map((m) => ({
      id: m.id,
      title: m.title,
      progress: typeof m.progress === 'number' ? m.progress : 0,
      last_studied: new Date(m.created_at).toLocaleDateString(),
      total_lessons: 10,
      completed_lessons: Math.round(((typeof m.progress === 'number' ? m.progress : 0) / 100) * 10)
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}