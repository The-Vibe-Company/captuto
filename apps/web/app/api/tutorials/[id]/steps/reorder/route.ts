import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ReorderBody {
  stepIds: string[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tutorialId } = await params;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify tutorial ownership
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id')
      .eq('id', tutorialId)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. Parse request body
    const body: ReorderBody = await request.json();
    const { stepIds } = body;

    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      return NextResponse.json(
        { error: 'stepIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // 4. Verify all steps belong to this tutorial
    const { data: existingSteps, error: stepsError } = await supabase
      .from('steps')
      .select('id')
      .eq('tutorial_id', tutorialId);

    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      return NextResponse.json(
        { error: 'Failed to fetch steps' },
        { status: 500 }
      );
    }

    const existingStepIds = new Set(existingSteps?.map((s) => s.id) || []);
    const invalidIds = stepIds.filter((id) => !existingStepIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid step IDs provided', invalidIds },
        { status: 400 }
      );
    }

    // 5. Update order_index for all steps
    const updatePromises = stepIds.map((stepId, index) =>
      supabase
        .from('steps')
        .update({ order_index: index })
        .eq('id', stepId)
        .eq('tutorial_id', tutorialId)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Error updating step orders:', errors);
      return NextResponse.json(
        { error: 'Failed to update step orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering steps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
