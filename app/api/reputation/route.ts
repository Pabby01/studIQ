import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const awardXpSchema = z.object({
  points: z.number().min(1).max(1000),
  reason: z.string().min(1).max(255),
  category: z.enum(['social', 'academic', 'collaboration', 'event', 'achievement']).optional()
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
    const userId = searchParams.get('userId') || user.id;

    // Get user's reputation data
    const { data: reputation, error: repError } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (repError && repError.code !== 'PGRST116') {
      console.error('Reputation fetch error:', repError);
      return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 });
    }

    // Get recent XP transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (transError) {
      console.error('Transactions fetch error:', transError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Get leaderboard position
    const { data: leaderboard, error: leaderError } = await supabase
      .from('user_reputation')
      .select('user_id, total_xp')
      .order('total_xp', { ascending: false })
      .limit(100);

    if (leaderError) {
      console.error('Leaderboard fetch error:', leaderError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const userPosition = leaderboard?.findIndex(u => u.user_id === userId) + 1 || null;

    return NextResponse.json({
      reputation: reputation || {
        user_id: userId,
        total_xp: 0,
        level: 1,
        current_level_xp: 0,
        next_level_xp: 100
      },
      transactions: transactions || [],
      leaderboardPosition: userPosition,
      totalUsers: leaderboard?.length || 0
    });
  } catch (error) {
    console.error('Reputation fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { points, reason, category } = awardXpSchema.parse(body);

    // Award XP using database function
    const { data, error: awardError } = await supabase.rpc('award_xp', {
      user_id: user.id,
      points,
      reason,
      category: category || 'achievement'
    });

    if (awardError) {
      console.error('Award XP error:', awardError);
      return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
    }

    // Get updated reputation
    const { data: reputation, error: repError } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (repError) {
      console.error('Updated reputation fetch error:', repError);
      return NextResponse.json({ error: 'Failed to fetch updated reputation' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'XP awarded successfully',
      reputation,
      pointsAwarded: points
    });
  } catch (error) {
    console.error('Award XP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}