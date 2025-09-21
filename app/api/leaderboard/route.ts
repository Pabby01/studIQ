import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const hubType = searchParams.get('hub') || 'total'; // 'total', 'campus', 'learning', 'finance', 'club'
    const clubId = searchParams.get('club_id');

    // Use the new unified leaderboard function
    const { data: leaderboardData, error: leaderError } = await supabase
      .rpc('get_leaderboard', {
        p_hub_type: hubType,
        p_limit: Math.min(limit, 100),
        p_club_id: clubId || null
      });

    if (leaderError) {
      console.error('Leaderboard fetch error:', leaderError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Get current user's XP data
    const { data: currentUserXp, error: userXpError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (userXpError && userXpError.code !== 'PGRST116') {
      console.error('User XP fetch error:', userXpError);
    }

    // Get current user's position in the leaderboard
    const currentUserPosition = leaderboardData?.findIndex((entry: any) => entry.user_id === session.user.id) + 1 || null;

    // Format leaderboard data
    const formattedLeaderboard = leaderboardData?.map((entry: any, index: number) => ({
      position: entry.rank_position,
      userId: entry.user_id,
      username: entry.username,
      avatarUrl: entry.avatar_url,
      xpAmount: entry.xp_amount,
      isCurrentUser: entry.user_id === session.user.id
    })) || [];

    // Calculate user's level based on total XP
    const userLevel = currentUserXp ? Math.floor(currentUserXp.total_xp / 100) + 1 : 1;

    return NextResponse.json({
      leaderboard: formattedLeaderboard,
      currentUser: {
        position: currentUserPosition,
        xp: currentUserXp ? {
          total: currentUserXp.total_xp,
          campus: currentUserXp.campus_xp,
          learning: currentUserXp.learning_xp,
          finance: currentUserXp.finance_xp,
          club: currentUserXp.club_xp,
          level: userLevel,
          dailyStreak: currentUserXp.daily_login_streak
        } : null
      },
      totalUsers: leaderboardData?.length || 0,
      hubType,
      clubId
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}