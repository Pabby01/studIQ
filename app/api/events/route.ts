import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  location: z.string().optional(),
  max_attendees: z.number().min(1).max(10000).default(100),
  is_virtual: z.boolean().default(false),
  club_id: z.string().uuid().optional(),
  requires_approval: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }).optional(),
  location: z.string().optional(),
  max_attendees: z.number().min(1).max(10000).optional(),
  is_virtual: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const club_id = searchParams.get('club_id');
    const upcoming = searchParams.get('upcoming') === 'true';
    const my_events = searchParams.get('my_events') === 'true';
    const search = searchParams.get('search');

    let query = supabase
      .from('events')
      .select(`
        *,
        created_by_user:users!events_created_by_fkey(username, avatar_url),
        club:clubs(name, id),
        attendee_count:event_rsvps(count),
        is_attending:event_rsvps!inner(user_id)
      `);

    if (club_id) {
      query = query.eq('club_id', club_id);
    }

    if (upcoming) {
      query = query.gte('date', new Date().toISOString());
    }

    if (my_events) {
      // Get user's ID from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      query = query.eq('event_rsvps.user_id', userData.id);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: events, error } = await query.order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events });
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
    const validatedData = createEventSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If club_id is provided, verify user has permission to create events for that club
    if (validatedData.club_id) {
      const { data: membership, error: membershipError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', validatedData.club_id)
        .eq('user_id', userData.id)
        .single();

      if (membershipError || !membership || !['admin', 'moderator'].includes(membership.role)) {
        return NextResponse.json({ error: 'Insufficient permissions to create events for this club' }, { status: 403 });
      }
    }

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...validatedData,
        created_by: userData.id,
      })
      .select(`
        *,
        created_by_user:users!events_created_by_fkey(username, avatar_url),
        club:clubs(name, id)
      `)
      .single();

    if (eventError) {
      console.error('Error creating event:', eventError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    // Automatically add creator as attendee
    const { error: attendeeError } = await supabase
      .from('event_rsvps')
      .insert({
        event_id: event.id,
        user_id: userData.id,
        status: 'going',
      });

    if (attendeeError) {
      console.error('Error adding creator as attendee:', attendeeError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ event }, { status: 201 });
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
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to update the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by, club_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the creator or has club permissions
    let hasPermission = event.created_by === userData.id;

    if (!hasPermission && event.club_id) {
      const { data: membership, error: membershipError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', event.club_id)
        .eq('user_id', userData.id)
        .single();

      hasPermission = !membershipError && membership && ['admin', 'moderator'].includes(membership.role);
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(validatedData)
      .eq('id', eventId)
      .select(`
        *,
        created_by_user:users!events_created_by_fkey(username, avatar_url),
        club:clubs(name, id)
      `)
      .single();

    if (updateError) {
      console.error('Error updating event:', updateError);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to delete the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by, club_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the creator or has club permissions
    let hasPermission = event.created_by === userData.id;

    if (!hasPermission && event.club_id) {
      const { data: membership, error: membershipError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', event.club_id)
        .eq('user_id', userData.id)
        .single();

      hasPermission = !membershipError && membership && ['admin', 'moderator'].includes(membership.role);
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the event (cascading deletes will handle attendees)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}