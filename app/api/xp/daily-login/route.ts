import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST - Award daily login XP
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Award daily login XP using the database function
    const { error: loginError } = await supabase
      .rpc('award_daily_login_xp', {
        p_user_id: user.id
      });

    if (loginError) {
      console.error('Daily login XP error:', loginError);
      return NextResponse.json({ error: 'Failed to award daily login XP' }, { status: 500 });
    }

    // Get updated user XP data to return current streak
    const { data: updatedXp, error: fetchError } = await supabase
      .from('user_xp')
      .select('daily_login_streak, last_login_date, total_xp')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Updated XP fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated data' }, { status: 500 });
    }

    // Calculate XP awarded (5 base + streak bonus, max 15)
    const streakBonus = Math.min(updatedXp.daily_login_streak - 1, 10);
    const xpAwarded = 5 + streakBonus;

    return NextResponse.json({
      success: true,
      xpAwarded,
      currentStreak: updatedXp.daily_login_streak,
      totalXp: updatedXp.total_xp,
      lastLogin: updatedXp.last_login_date,
      message: updatedXp.daily_login_streak === 1 
        ? 'Welcome back! Daily login XP awarded.' 
        : `${updatedXp.daily_login_streak} day streak! Keep it up!`
    });
  } catch (error) {
    console.error('Daily login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}