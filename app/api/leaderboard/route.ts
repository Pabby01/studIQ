import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category') || 'all';

    let query = supabase
      .from('user_reputation')
      .select(`
        user_id,
        total_xp,
        level,
        profiles:user_id (
          full_name,
          avatar_url,
          username
        )
      `)
      .order('total_xp', { ascending: false })
      .limit(Math.min(limit, 100));

    // Filter by category if specified
    if (category !== 'all') {
      // Get users with XP in specific category
      const { data: categoryUsers, error: categoryError } = await supabase
        .from('xp_transactions')
        .select('user_id')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (categoryError) {
        console.error('Category filter error:', categoryError);
        return NextResponse.json({ error: 'Failed to filter by category' }, { status: 500 });
      }

      const userIds = Array.from(new Set(categoryUsers?.map(t => t.user_id) || []));
      if (userIds.length > 0) {
        query = query.in('user_id', userIds);
      }
    }

    const { data: leaderboard, error: leaderError } = await query;

    if (leaderError) {
      console.error('Leaderboard fetch error:', leaderError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Get current user's position
    const { data: allUsers, error: allUsersError } = await supabase
      .from('user_reputation')
      .select('user_id, total_xp')
      .order('total_xp', { ascending: false });

    if (allUsersError) {
      console.error('All users fetch error:', allUsersError);
      return NextResponse.json({ error: 'Failed to fetch user position' }, { status: 500 });
    }

    const currentUserPosition = allUsers?.findIndex(u => u.user_id === user.id) + 1 || null;
    const currentUserData = leaderboard?.find(u => u.user_id === user.id);

    // Format leaderboard data
    const formattedLeaderboard = leaderboard?.map((entry, index) => ({
      position: index + 1,
      userId: entry.user_id,
      totalXp: entry.total_xp,
      level: entry.level,
      profile: entry.profiles ? {
        fullName: Array.isArray(entry.profiles) ? entry.profiles[0]?.full_name : (entry.profiles as any).full_name,
        avatarUrl: Array.isArray(entry.profiles) ? entry.profiles[0]?.avatar_url : (entry.profiles as any).avatar_url,
        username: Array.isArray(entry.profiles) ? entry.profiles[0]?.username : (entry.profiles as any).username
      } : null,
      isCurrentUser: entry.user_id === user.id
    })) || [];

    return NextResponse.json({
      leaderboard: formattedLeaderboard,
      currentUser: {
        position: currentUserPosition,
        data: currentUserData ? {
          userId: currentUserData.user_id,
          totalXp: currentUserData.total_xp,
          level: currentUserData.level,
          profile: currentUserData.profiles
        } : null
      },
      totalUsers: allUsers?.length || 0,
      category
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}