import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file', 'announcement']).default('text'),
  reply_to: z.string().uuid().optional(),
  metadata: z.object({
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    fileType: z.string().optional(),
    imageUrl: z.string().url().optional()
  }).optional()
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
    const { content, type, reply_to, metadata } = messageSchema.parse(body);
    const clubId = params.id;

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the club
    const { data: membership, error: memberError } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userData.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Not a member of this club' }, { status: 403 });
    }

    // Check if replying to a valid message
    if (reply_to) {
      const { data: parentMessage, error: parentError } = await supabase
        .from('club_messages')
        .select('id')
        .eq('id', reply_to)
        .eq('club_id', clubId)
        .single();

      if (parentError || !parentMessage) {
        return NextResponse.json({ error: 'Parent message not found' }, { status: 400 });
      }
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('club_messages')
      .insert({
        club_id: clubId,
        user_id: userData.id,
        content,
        type,
        reply_to,
        metadata,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        user_profile:users!club_messages_user_id_fkey (
          full_name,
          avatar_url,
          username
        ),
        reply_to_message:reply_to (
          id,
          content,
          type,
          user_profile:users!club_messages_user_id_fkey (
            full_name,
            username
          )
        )
      `)
      .single();

    if (messageError) {
      console.error('Message creation error:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update club's last activity
    await supabase
      .from('clubs')
      .update({ 
        last_activity: new Date().toISOString()
      })
      .eq('id', clubId);

    // Award XP for participation
    await supabase.rpc('award_xp', {
      user_id: userData.id,
      points: 2,
      reason: 'Participated in club chat',
      category: 'social'
    });

    // Send real-time notification to club members
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId)
      .neq('user_id', userData.id);

    if (members && members.length > 0) {
      const notifications = members.map(member => ({
        user_id: member.user_id,
        type: 'club_message',
        title: 'New Club Message',
        message: `${user.email} sent a message in the club`,
        data: {
          clubId,
          messageId: message.id,
          messageContent: content.substring(0, 100),
          senderName: user.email
        },
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const before = searchParams.get('before'); // For pagination
    
    const clubId = params.id;

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the club
    const { data: membership, error: memberError } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userData.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Not a member of this club' }, { status: 403 });
    }

    let query = supabase
      .from('club_messages')
      .select(`
        *,
        user_profile:users!club_messages_user_id_fkey (
          full_name,
          avatar_url,
          username
        ),
        reply_to_message:reply_to (
          id,
          content,
          type,
          user_profile:users!club_messages_user_id_fkey (
            full_name,
            username
          )
        ),
        reactions:message_reactions (
          id,
          emoji,
          user_id,
          user_profile:users!message_reactions_user_id_fkey (
            username
          )
        )
      `)
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get total message count for pagination
    const { count, error: countError } = await supabase
      .from('club_messages')
      .select('*', { count: 'exact' })
      .eq('club_id', clubId);

    if (countError) {
      console.error('Message count error:', countError);
    }

    return NextResponse.json({
      messages: messages?.reverse() || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (messages?.length || 0) === limit
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
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
    const messageId = searchParams.get('messageId');
    const clubId = params.id;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Check if user owns the message or is club admin
    const { data: message, error: messageError } = await supabase
      .from('club_messages')
      .select('user_id')
      .eq('id', messageId)
      .eq('club_id', clubId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const isOwner = message.user_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .single();

      isAdmin = membership?.role === 'admin' || membership?.role === 'moderator';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete message
    const { error: deleteError } = await supabase
      .from('club_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      console.error('Delete message error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}