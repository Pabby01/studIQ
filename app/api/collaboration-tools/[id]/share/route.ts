import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const shareSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  permission: z.enum(['view', 'edit', 'admin']).default('view'),
  message: z.string().max(500).optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, permission, message } = shareSchema.parse(body);
    const toolId = params.id;

    // Check if user owns or has admin access to the tool
    const { data: tool, error: toolError } = await supabase
      .from('collaboration_tools')
      .select('id, title, created_by, club_id')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = tool.created_by === user.id;
    let hasAdminAccess = false;

    if (tool.club_id) {
      const { data: membership } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', tool.club_id)
        .eq('user_id', user.id)
        .single();

      hasAdminAccess = membership?.role === 'admin' || membership?.role === 'moderator';
    }

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create share records
    const shareRecords = userIds.map(userId => ({
      tool_id: toolId,
      user_id: userId,
      shared_by: user.id,
      permission,
      message,
      created_at: new Date().toISOString()
    }));

    const { data: shares, error: shareError } = await supabase
      .from('tool_shares')
      .upsert(shareRecords, {
        onConflict: 'tool_id,user_id'
      })
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          username
        )
      `);

    if (shareError) {
      console.error('Share error:', shareError);
      return NextResponse.json({ error: 'Failed to share tool' }, { status: 500 });
    }

    // Send notifications to shared users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'tool_shared',
      title: 'Tool Shared With You',
      message: `${user.email} shared "${tool.title}" with you`,
      data: {
        toolId,
        toolTitle: tool.title,
        sharedBy: user.email,
        permission,
        customMessage: message
      },
      created_at: new Date().toISOString()
    }));

    await supabase
      .from('notifications')
      .insert(notifications);

    // Award XP for collaboration
    await supabase.rpc('award_xp', {
      user_id: user.id,
      points: 5 * userIds.length,
      reason: `Shared collaboration tool: ${tool.title}`,
      category: 'collaboration'
    });

    return NextResponse.json({ 
      shares,
      message: `Tool shared with ${userIds.length} user(s) successfully`
    });
  } catch (error) {
    console.error('Share tool error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const toolId = params.id;

    // Get all shares for this tool
    const { data: shares, error: sharesError } = await supabase
      .from('tool_shares')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          username
        ),
        shared_by_profile:shared_by (
          full_name,
          avatar_url,
          username
        )
      `)
      .eq('tool_id', toolId)
      .order('created_at', { ascending: false });

    if (sharesError) {
      console.error('Shares fetch error:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    return NextResponse.json({ shares: shares || [] });
  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const toolId = params.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check if user has permission to remove shares
    const { data: tool, error: toolError } = await supabase
      .from('collaboration_tools')
      .select('created_by, club_id')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const isOwner = tool.created_by === user.id;
    const isSelfRemoval = userId === user.id;

    if (!isOwner && !isSelfRemoval) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Remove share
    const { error: deleteError } = await supabase
      .from('tool_shares')
      .delete()
      .eq('tool_id', toolId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Remove share error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove share' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Share removed successfully' });
  } catch (error) {
    console.error('Remove share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}