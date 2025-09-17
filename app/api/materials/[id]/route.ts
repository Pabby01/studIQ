import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server';

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

    return NextResponse.json({ item: data });
  } catch (e: any) {
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