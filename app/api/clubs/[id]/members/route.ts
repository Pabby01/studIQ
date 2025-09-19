import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const joinClubSchema = z.object({
  message: z.string().optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(['member', 'moderator', 'admin']),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = params.id;

    // Get club members with user details
    const { data: members, error } = await supabase
      .from('club_members')
      .select(`
        *,
        user:users!club_members_user_id_fkey(
          id,
          username,
          avatar_url,
          campus_xp
        )
      `)
      .eq('club_id', clubId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching club members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = params.id;
    const body = await request.json();
    const validatedData = joinClubSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if club exists and get details
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, name, is_private, max_members')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', userData.id)
      .single();

    if (!memberCheckError && existingMember) {
      return NextResponse.json({ error: 'Already a member of this club' }, { status: 400 });
    }

    // Check member count limit
    const { count: memberCount, error: countError } = await supabase
      .from('club_members')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    if (countError) {
      console.error('Error checking member count:', countError);
      return NextResponse.json({ error: 'Failed to check member limit' }, { status: 500 });
    }

    if (memberCount && memberCount >= club.max_members) {
      return NextResponse.json({ error: 'Club has reached maximum member limit' }, { status: 400 });
    }

    // For private clubs, create a join request instead of direct membership
    if (club.is_private) {
      const { data: joinRequest, error: requestError } = await supabase
        .from('club_join_requests')
        .insert({
          club_id: clubId,
          user_id: userData.id,
          message: validatedData.message,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating join request:', requestError);
        return NextResponse.json({ error: 'Failed to create join request' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Join request sent successfully',
        join_request: joinRequest 
      }, { status: 201 });
    }

    // For public clubs, add member directly
    const { data: membership, error: membershipError } = await supabase
      .from('club_members')
      .insert({
        club_id: clubId,
        user_id: userData.id,
        role: 'member',
      })
      .select(`
        *,
        user:users!club_members_user_id_fkey(
          id,
          username,
          avatar_url,
          campus_xp
        )
      `)
      .single();

    if (membershipError) {
      console.error('Error adding member:', membershipError);
      return NextResponse.json({ error: 'Failed to join club' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Successfully joined club',
      membership 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = params.id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    // Get the current user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user has permission to update roles
    const { data: currentUserMembership, error: membershipError } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userData.id)
      .single();

    if (membershipError || !currentUserMembership || !['admin', 'moderator'].includes(currentUserMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Moderators can't promote to admin or modify other moderators/admins
    if (currentUserMembership.role === 'moderator' && validatedData.role === 'admin') {
      return NextResponse.json({ error: 'Moderators cannot promote to admin' }, { status: 403 });
    }

    // Update member role
    const { data: updatedMembership, error: updateError } = await supabase
      .from('club_members')
      .update({ role: validatedData.role })
      .eq('club_id', clubId)
      .eq('user_id', targetUserId)
      .select(`
        *,
        user:users!club_members_user_id_fkey(
          id,
          username,
          avatar_url,
          campus_xp
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Member role updated successfully',
      membership: updatedMembership 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = params.id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');

    // Get the current user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If no target user specified, user is leaving the club
    const userToRemove = targetUserId || userData.id;

    // Check permissions for removing others
    if (targetUserId && targetUserId !== userData.id) {
      const { data: currentUserMembership, error: membershipError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', userData.id)
        .single();

      if (membershipError || !currentUserMembership || !['admin', 'moderator'].includes(currentUserMembership.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Remove member
    const { error: removeError } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userToRemove);

    if (removeError) {
      console.error('Error removing member:', removeError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: targetUserId ? 'Member removed successfully' : 'Successfully left club'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}