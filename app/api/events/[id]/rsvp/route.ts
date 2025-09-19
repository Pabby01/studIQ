import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const rsvpSchema = z.object({
  status: z.enum(['attending', 'not_attending', 'maybe'])
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
    const { status } = rsvpSchema.parse(body);
    const eventId = params.id;

    // Check if event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, max_attendees')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check current attendee count if trying to attend
    if (status === 'attending' && event.max_attendees) {
      const { count } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('status', 'attending');

      if (count && count >= event.max_attendees) {
        return NextResponse.json({ error: 'Event is full' }, { status: 400 });
      }
    }

    // Upsert RSVP
    const { data: rsvp, error: rsvpError } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: eventId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,user_id'
      })
      .select()
      .single();

    if (rsvpError) {
      console.error('RSVP error:', rsvpError);
      return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 });
    }

    // Award XP for attending events
    if (status === 'attending') {
      await supabase.rpc('award_xp', {
        user_id: user.id,
        points: 10,
        reason: `RSVP'd to event: ${event.title}`
      });
    }

    return NextResponse.json({ rsvp });
  } catch (error) {
    console.error('RSVP error:', error);
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

    const eventId = params.id;

    // Get user's RSVP status
    const { data: rsvp, error: rsvpError } = await supabase
      .from('event_rsvps')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (rsvpError && rsvpError.code !== 'PGRST116') {
      console.error('RSVP fetch error:', rsvpError);
      return NextResponse.json({ error: 'Failed to fetch RSVP' }, { status: 500 });
    }

    // Get RSVP counts
    const { data: counts, error: countsError } = await supabase
      .from('event_rsvps')
      .select('status')
      .eq('event_id', eventId);

    if (countsError) {
      console.error('RSVP counts error:', countsError);
      return NextResponse.json({ error: 'Failed to fetch RSVP counts' }, { status: 500 });
    }

    const rsvpCounts = {
      attending: counts?.filter(r => r.status === 'attending').length || 0,
      not_attending: counts?.filter(r => r.status === 'not_attending').length || 0,
      maybe: counts?.filter(r => r.status === 'maybe').length || 0
    };

    return NextResponse.json({ 
      userRsvp: rsvp?.status || null,
      counts: rsvpCounts
    });
  } catch (error) {
    console.error('RSVP fetch error:', error);
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

    const eventId = params.id;

    // Delete RSVP
    const { error: deleteError } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('RSVP delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete RSVP' }, { status: 500 });
    }

    return NextResponse.json({ message: 'RSVP removed successfully' });
  } catch (error) {
    console.error('RSVP delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}