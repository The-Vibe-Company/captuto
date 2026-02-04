import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ tutorialId: string }>;
}

// GET /api/sources/[tutorialId] - Get all sources for a tutorial
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { tutorialId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the tutorial belongs to this user
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id')
      .eq('id', tutorialId)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all sources for this tutorial
    // Note: Using type assertion due to regenerated types not including all columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sources, error: sourcesError } = await (supabase as any)
      .from('sources')
      .select('*')
      .eq('tutorial_id', tutorialId)
      .order('order_index', { ascending: true });

    if (sourcesError) {
      console.error('Failed to fetch sources:', sourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch sources' },
        { status: 500 }
      );
    }

    // Generate signed URLs for screenshots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourcesWithUrls = await Promise.all(
      (sources || []).map(async (source: any) => {
        let signedScreenshotUrl: string | null = null;

        if (source.screenshot_url) {
          const { data: signedUrl } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(source.screenshot_url, 3600); // 1 hour

          signedScreenshotUrl = signedUrl?.signedUrl || null;
        }

        // Parse element_info if it's a string
        let elementInfo = source.element_info;
        if (typeof elementInfo === 'string') {
          try {
            elementInfo = JSON.parse(elementInfo);
          } catch {
            elementInfo = null;
          }
        }

        return {
          ...source,
          signedScreenshotUrl,
          element_info: elementInfo,
        };
      })
    );

    return NextResponse.json({ sources: sourcesWithUrls });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
