import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, resolveUserRowId, getSupabaseAdmin } from '@/lib/supabase-server';
import { SendAI } from '@/lib/sendai-service';

// Utility sanitizers to prevent leaking URLs/boilerplate into UI
const sanitizeText = (s: any): string => {
  if (typeof s !== 'string') return '';
  return s
    .replace(/https?:\/\/\S+/g, '')
    .replace(/Extracted\s+text\s+from\s+file:\s*/gi, '')
    .replace(/Extracted\s+text\s+from:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeQuiz = (quiz: any): any => {
  if (!Array.isArray(quiz)) return quiz;
  return quiz.map((q) => {
    // MCQ shape
    if (q && typeof q === 'object' && typeof q.question === 'string' && Array.isArray(q.options)) {
      const opts = (q.options as any[]).map((o) => sanitizeText(o));
      return { ...q, question: sanitizeText(q.question), options: opts };
    }
    // Legacy shape { q, a? }
    if (q && typeof q === 'object' && typeof q.q === 'string') {
      const next: any = { ...q, q: sanitizeText(q.q) };
      if (typeof q.a === 'string') next.a = sanitizeText(q.a);
      return next;
    }
    return q;
  });
};

// GET /api/materials/[id] -> fetch a single material for the current user
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });

    const id = params.id;

    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userRowId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Sanitize before returning (covers legacy rows that may contain URLs)
    const item: any = { ...data };
    item.summary = sanitizeText(item.summary || '');
    if (Array.isArray(item.quiz)) item.quiz = sanitizeQuiz(item.quiz);

    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

// POST /api/materials/[id] -> on-demand generation (summary or quiz)
// Expected body: { action: 'summary' | 'quiz', count?: 10 | 20 | 50, useWebSearch?: boolean }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });

    const id = params.id;
    const body = await req.json().catch(() => ({} as any));
    const action = body?.action as 'summary' | 'quiz' | undefined;
    const countRaw = Number(body?.count);
    const count = [10, 20, 50].includes(countRaw) ? countRaw : 10;
    const useWebSearch = body?.useWebSearch !== false; // default true

    if (!action || (action !== 'summary' && action !== 'quiz')) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Fetch material to get file url/title
    const { data: material, error: materialErr } = await supabase
      .from('course_materials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userRowId)
      .single();

    if (materialErr || !material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

    const sendai = new SendAI(process.env.SENDAI_API_KEY, process.env.SENDAI_API_URL);

    // Determine text to process
    let text = '';
    const fileUrl: string | null = (material as any).file_url || null;
    try {
      if (fileUrl && !/^text:\/\//.test(fileUrl)) {
        text = await sendai.extractText(fileUrl, { sourceTitle: (material as any).title });
      } else if (typeof (material as any).summary === 'string' && (material as any).summary.trim().length > 0) {
        // Fallback if we only have inline text that is not retrievable: use existing summary as basis
        text = (material as any).summary;
      } else if (typeof (material as any).title === 'string') {
        text = (material as any).title;
      }
    } catch (e) {
      console.warn('Failed to extract text; proceeding with fallback content');
    }

    const updates: Record<string, any> = {};

    if (action === 'summary') {
      const res = await sendai.summarize(text);
      updates.summary = sanitizeText(res.summary);
    } else if (action === 'quiz') {
      const res = await sendai.generateMCQ(text, count, { sourceTitle: (material as any).title, useWebSearch });
      updates.quiz = sanitizeQuiz(res.questions as any[]);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('course_materials')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userRowId)
      .select('*')
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    // Sanitize again on the way out for safety
    const item: any = { ...updated };
    item.summary = sanitizeText(item.summary || '');
    if (Array.isArray(item.quiz)) item.quiz = sanitizeQuiz(item.quiz);

    return NextResponse.json({ item });
  } catch (e: any) {
    console.error('Unexpected error in POST /api/materials/[id]:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

// PATCH /api/materials/[id] -> update progress for the current user
// Expected body: { progress?: number }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });

    const id = params.id;
    const body = await req.json();

    const updates: Record<string, any> = {};
    if (typeof body?.progress === 'number' && Number.isFinite(body.progress)) {
      updates.progress = Math.max(0, Math.min(100, Math.round(body.progress)));
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('course_materials')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userRowId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

// DELETE /api/materials/[id] -> delete a material and its storage object (best-effort)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });

    const id = params.id;

    // Load row to get file_url
    const { data: material, error: materialErr } = await supabase
      .from('course_materials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userRowId)
      .single();

    if (materialErr || !material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

    // Attempt to delete the underlying storage object if it's a Supabase public URL
    const fileUrl: string | null = (material as any).file_url || null;
    const tryDeleteStorage = async () => {
      if (!fileUrl || !/\/storage\/v1\/object\//.test(fileUrl)) return;
      const m = fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (!m) return;
      const bucket = m[1];
      const path = m[2];
      const admin = getSupabaseAdmin();
      const client = admin || supabase;
      try {
        await client.storage.from(bucket).remove([path]);
      } catch (e) {
        console.warn('[DELETE /materials/:id] Failed to delete storage object', e);
      }
    };
    await tryDeleteStorage();

    // Delete the DB row
    const { error: delErr } = await supabase
      .from('course_materials')
      .delete()
      .eq('id', id)
      .eq('user_id', userRowId);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}