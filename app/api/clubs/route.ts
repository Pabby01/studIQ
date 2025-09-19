import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createClubSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['academic', 'sports', 'arts', 'technology', 'social', 'other']),
  is_private: z.boolean().default(false),
  max_members: z.number().min(1).max(1000).default(500),
});

const updateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category: z.enum(['academic', 'sports', 'arts', 'technology', 'social', 'other']).optional(),
  is_private: z.boolean().optional(),
  max_members: z.number().min(1).max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const my_clubs = searchParams.get('my_clubs') === 'true';

    let query = supabase
      .from('clubs')
      .select(`
        *,
        created_by_user:users!clubs_created_by_fkey(username, avatar_url),
        member_count:club_members(count),
        is_member:club_members!inner(user_id)
      `);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (my_clubs) {
      query = query.eq('club_members.user_id', user.id);
    }

    const { data: clubs, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clubs:', error);
      return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
    }

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createClubSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the club
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .insert({
        ...validatedData,
        created_by: userData.id,
      })
      .select()
      .single();

    if (clubError) {
      console.error('Error creating club:', clubError);
      return NextResponse.json({ error: 'Failed to create club' }, { status: 500 });
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('club_members')
      .insert({
        club_id: club.id,
        user_id: userData.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ club }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('id');

    if (!clubId) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateClubSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is admin of the club
    const { data: membership, error: membershipError } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userData.id)
      .single();

    if (membershipError || !membership || !['admin', 'moderator'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the club
    const { data: club, error: updateError } = await supabase
      .from('clubs')
      .update(validatedData)
      .eq('id', clubId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating club:', updateError);
      return NextResponse.json({ error: 'Failed to update club' }, { status: 500 });
    }

    return NextResponse.json({ club });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}