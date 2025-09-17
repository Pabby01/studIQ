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
      .select('id, title, progress, created_at, quiz, summary')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const sanitize = (s: string, title?: string) => {
      if (!s) return title || '';
      const cleaned = s
        .replace(/https?:\/\/\S+/g, '')
        .replace(/Extracted\s+text\s+from\s+file:\s*/i, '')
        .trim();
      return cleaned || (title || '');
    };

    const items = (data || []).map((m) => {
      const quizArray = Array.isArray((m as any).quiz) ? ((m as any).quiz as any[]) : [];
      const quiz_count = quizArray.length;
      const summary: string = (m as any).summary || '';
      const title: string = (m as any).title || '';
      const sanitized = sanitize(summary, title);
      const summary_excerpt = sanitized ? sanitized.slice(0, 160) + (sanitized.length > 160 ? '…' : '') : '';
      return {
        id: (m as any).id,
        title: title,
        progress: typeof (m as any).progress === 'number' ? (m as any).progress : 0,
        last_studied: new Date((m as any).created_at).toLocaleDateString(),
        quiz_count,
        summary_excerpt,
      };
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}