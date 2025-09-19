import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Notifications fetch error:', notificationsError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('read', false);

    if (countError) {
      console.error('Unread count error:', countError);
    }

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        hasMore: (notifications?.length || 0) === limit
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = markReadSchema.parse(body);

    let query = supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (markAll) {
      // Mark all notifications as read
      query = query.eq('read', false);
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      query = query.in('id', notificationIds);
    } else {
      return NextResponse.json({ error: 'No notifications specified' }, { status: 400 });
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error('Mark read error:', updateError);
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    // Get updated unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('read', false);

    if (countError) {
      console.error('Updated unread count error:', countError);
    }

    return NextResponse.json({
      message: markAll ? 'All notifications marked as read' : 'Notifications marked as read',
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      // Delete all read notifications
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (deleteError) {
        console.error('Delete all notifications error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
      }

      return NextResponse.json({ message: 'All read notifications deleted' });
    } else if (notificationId) {
      // Delete specific notification
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Delete notification error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Notification deleted' });
    } else {
      return NextResponse.json({ error: 'No notification specified' }, { status: 400 });
    }
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}