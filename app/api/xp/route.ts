import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Fetch user's XP data
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;

    // Get user's XP data
    const { data: userXp, error: xpError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (xpError && xpError.code !== 'PGRST116') {
      console.error('User XP fetch error:', xpError);
      return NextResponse.json({ error: 'Failed to fetch user XP' }, { status: 500 });
    }

    // Get recent XP logs
    const { data: recentLogs, error: logsError } = await supabase
      .from('xp_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('XP logs fetch error:', logsError);
    }

    // Calculate level and progress to next level
    const totalXp = userXp?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const xpForCurrentLevel = (level - 1) * 100;
    const xpForNextLevel = level * 100;
    const progressToNextLevel = totalXp - xpForCurrentLevel;

    // Determine badge based on total XP
    let badge = 'Bronze';
    if (totalXp >= 1000) badge = 'Gold';
    else if (totalXp >= 500) badge = 'Silver';

    return NextResponse.json({
      xp: userXp ? {
        total: userXp.total_xp,
        campus: userXp.campus_xp,
        learning: userXp.learning_xp,
        finance: userXp.finance_xp,
        club: userXp.club_xp,
        dailyStreak: userXp.daily_login_streak,
        lastLogin: userXp.last_login_date,
        lastUpdated: userXp.last_updated
      } : {
        total: 0,
        campus: 0,
        learning: 0,
        finance: 0,
        club: 0,
        dailyStreak: 0,
        lastLogin: null,
        lastUpdated: null
      },
      level,
      badge,
      progress: {
        current: progressToNextLevel,
        required: 100,
        percentage: (progressToNextLevel / 100) * 100
      },
      recentActivity: recentLogs || []
    });
  } catch (error) {
    console.error('XP fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Award XP to user
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      action, 
      xpAmount, 
      hubType = 'general', 
      referenceId = null, 
      referenceType = null, 
      metadata = {} 
    } = body;

    if (!action || !xpAmount || xpAmount <= 0) {
      return NextResponse.json({ error: 'Invalid action or XP amount' }, { status: 400 });
    }

    // Award XP using the database function
    const { error: awardError } = await supabase
      .rpc('award_unified_xp', {
        p_user_id: user.id,
        p_action: action,
        p_xp_amount: xpAmount,
        p_hub_type: hubType,
        p_reference_id: referenceId,
        p_reference_type: referenceType,
        p_metadata: metadata
      });

    if (awardError) {
      console.error('XP award error:', awardError);
      return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
    }

    // Get updated user XP data
    const { data: updatedXp, error: fetchError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Updated XP fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated XP' }, { status: 500 });
    }

    const newLevel = Math.floor(updatedXp.total_xp / 100) + 1;
    const oldLevel = Math.floor((updatedXp.total_xp - xpAmount) / 100) + 1;
    const leveledUp = newLevel > oldLevel;

    return NextResponse.json({
      success: true,
      xpAwarded: xpAmount,
      newTotalXp: updatedXp.total_xp,
      newLevel,
      leveledUp,
      action,
      hubType
    });
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}