import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createToolSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['notes', 'flashcards', 'study_pack']),
  content: z.any(), // JSON content varies by type
  is_public: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  club_id: z.string().uuid().optional(),
});

const updateToolSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  is_public: z.boolean().optional(),
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
    const type = searchParams.get('type');
    const club_id = searchParams.get('club_id');
    const my_tools = searchParams.get('my_tools') === 'true';
    const search = searchParams.get('search');
    const public_only = searchParams.get('public_only') === 'true';

    // Get user's ID from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let query = supabase
      .from('collaboration_tools')
      .select(`
        *,
        creator:users!collaboration_tools_created_by_fkey(username, avatar_url),
        club:clubs(name, id),
        likes_count:collaboration_tool_likes(count),
        is_liked:collaboration_tool_likes!inner(user_id)
      `);

    if (type) {
      query = query.eq('type', type);
    }

    if (club_id) {
      query = query.eq('club_id', club_id);
    }

    if (my_tools) {
      query = query.eq('created_by', userData.id);
    } else if (public_only) {
      query = query.eq('is_public', true);
    } else {
      // Show public tools and user's private tools
      query = query.or(`is_public.eq.true,created_by.eq.${userData.id}`);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,tags.cs.{${search}}`);
    }

    const { data: tools, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collaboration tools:', error);
      return NextResponse.json({ error: 'Failed to fetch collaboration tools' }, { status: 500 });
    }

    return NextResponse.json({ tools });
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
    const validatedData = createToolSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If club_id is provided, verify user is a member
    if (validatedData.club_id) {
      const { data: membership, error: membershipError } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', validatedData.club_id)
        .eq('user_id', userData.id)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json({ error: 'Must be a club member to create tools for this club' }, { status: 403 });
      }
    }

    // Validate content based on type
    let processedContent = validatedData.content;
    
    switch (validatedData.type) {
      case 'notes':
        if (typeof processedContent !== 'string') {
          return NextResponse.json({ error: 'Notes content must be a string' }, { status: 400 });
        }
        break;
      case 'flashcards':
        if (!Array.isArray(processedContent) || !processedContent.every(card => 
          typeof card === 'object' && 'front' in card && 'back' in card
        )) {
          return NextResponse.json({ error: 'Flashcards content must be an array of {front, back} objects' }, { status: 400 });
        }
        break;
      case 'study_pack':
        if (typeof processedContent !== 'object' || !processedContent.resources) {
          return NextResponse.json({ error: 'Study pack content must be an object with resources' }, { status: 400 });
        }
        break;
    }

    // Create the collaboration tool
    const { data: tool, error: toolError } = await supabase
      .from('collaboration_tools')
      .insert({
        ...validatedData,
        content: processedContent,
        created_by: userData.id,
      })
      .select(`
        *,
        creator:users!collaboration_tools_created_by_fkey(username, avatar_url),
        club:clubs(name, id)
      `)
      .single();

    if (toolError) {
      console.error('Error creating collaboration tool:', toolError);
      return NextResponse.json({ error: 'Failed to create collaboration tool' }, { status: 500 });
    }

    // Award XP for creating content
    const xpAmount = validatedData.type === 'study_pack' ? 50 : 25;
    const { error: xpError } = await supabase.rpc('award_xp', {
      user_id: userData.id,
      amount: xpAmount,
      reason: `Created ${validatedData.type}: ${validatedData.title}`,
    });

    if (xpError) {
      console.error('Error awarding XP:', xpError);
      // Don't fail the request for XP errors
    }

    return NextResponse.json({ tool }, { status: 201 });
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
    const toolId = searchParams.get('id');

    if (!toolId) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateToolSchema.parse(body);

    // Get the user's ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user owns the tool
    const { data: tool, error: toolError } = await supabase
      .from('collaboration_tools')
      .select('created_by, type')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    if (tool.created_by !== userData.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate content if provided
    if (validatedData.content) {
      switch (tool.type) {
        case 'notes':
          if (typeof validatedData.content !== 'string') {
            return NextResponse.json({ error: 'Notes content must be a string' }, { status: 400 });
          }
          break;
        case 'flashcards':
          if (!Array.isArray(validatedData.content) || !validatedData.content.every(card => 
            typeof card === 'object' && 'front' in card && 'back' in card
          )) {
            return NextResponse.json({ error: 'Flashcards content must be an array of {front, back} objects' }, { status: 400 });
          }
          break;
        case 'study_pack':
          if (typeof validatedData.content !== 'object' || !validatedData.content.resources) {
            return NextResponse.json({ error: 'Study pack content must be an object with resources' }, { status: 400 });
          }
          break;
      }
    }

    // Update the tool
    const { data: updatedTool, error: updateError } = await supabase
      .from('collaboration_tools')
      .update(validatedData)
      .eq('id', toolId)
      .select(`
        *,
        creator:users!collaboration_tools_created_by_fkey(username, avatar_url),
        club:clubs(name, id)
      `)
      .single();

    if (updateError) {
      console.error('Error updating collaboration tool:', updateError);
      return NextResponse.json({ error: 'Failed to update collaboration tool' }, { status: 500 });
    }

    return NextResponse.json({ tool: updatedTool });
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
    const toolId = searchParams.get('id');

    if (!toolId) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 });
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

    // Check if user owns the tool
    const { data: tool, error: toolError } = await supabase
      .from('collaboration_tools')
      .select('created_by')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    if (tool.created_by !== userData.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the tool
    const { error: deleteError } = await supabase
      .from('collaboration_tools')
      .delete()
      .eq('id', toolId);

    if (deleteError) {
      console.error('Error deleting collaboration tool:', deleteError);
      return NextResponse.json({ error: 'Failed to delete collaboration tool' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Collaboration tool deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}