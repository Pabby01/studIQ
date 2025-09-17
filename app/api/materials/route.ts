// cSpell:words Supabase supabase
import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server';
import { SendAI } from '@/lib/sendai-service';
import type { QuizQuestion } from '@/lib/sendai-service';

// GET /api/materials -> list current user's course materials
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) {
      return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('user_id', userRowId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    console.error('Unexpected error in GET /api/materials:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

// POST /api/materials -> upload/process materials and insert row
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) {
      return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });
    }

    const body = await req.json();
    const title: string | undefined = body?.title;
    const fileUrl: string | undefined = body?.fileUrl;
    const textContent: string | undefined = body?.textContent;

    if (!title && !fileUrl && !textContent) {
      return NextResponse.json(
        { error: 'Provide at least title, fileUrl, or textContent' },
        { status: 400 }
      );
    }

    // Initialize SendAI client (remote if SENDAI_API_URL+KEY set, otherwise local fallback)
    const sendai = new SendAI(process.env.SENDAI_API_KEY, process.env.SENDAI_API_URL);

    // Process content with SendAI
    let summary: string | null = null;
    let quiz: QuizQuestion[] | null = null;

    try {
      if (textContent) {
        const summaryResponse = await sendai.summarize(textContent);
        summary = summaryResponse.summary;
        const quizResponse = await sendai.generateQuiz(textContent);
        quiz = quizResponse.questions;
      } else if (fileUrl) {
        const extractedText = await sendai.extractText(fileUrl);
        const summaryResponse = await sendai.summarize(extractedText);
        summary = summaryResponse.summary;
        const quizResponse = await sendai.generateQuiz(extractedText);
        quiz = quizResponse.questions;
      }
    } catch (error) {
      console.error('Error processing content with SendAI:', error);
      return NextResponse.json(
        { error: 'Failed to process content' },
        { status: 500 }
      );
    }

    const insertPayload = {
      user_id: userRowId,
      title: title || 'Untitled Material',
      file_url: fileUrl || 'text://inline',
      summary: summary,
      quiz: quiz,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('course_materials')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting material:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: any) {
    console.error('Unexpected error in POST /api/materials:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}