import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditorClient } from '@/components/editor/EditorClient';
import type { SourceWithSignedUrl, StepWithSignedUrl, Annotation, ElementInfo } from '@/lib/types/editor';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch tutorial
  const { data: tutorial, error: tutorialError } = await supabase
    .from('tutorials')
    .select('*')
    .eq('id', id)
    .single();

  if (tutorialError || !tutorial) {
    notFound();
  }

  // 3. Check ownership
  if (tutorial.user_id !== user.id) {
    redirect('/dashboard?error=access_denied');
  }

  // 4. Fetch sources (raw captured data)
  // Note: Using type assertion due to regenerated types not including all columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sources, error: sourcesError } = await (supabase as any)
    .from('sources')
    .select('*')
    .eq('tutorial_id', id)
    .order('order_index', { ascending: true });

  if (sourcesError) {
    console.error('Failed to fetch sources:', sourcesError);
    // Don't throw - sources table might not exist yet during migration
  }

  // 5. Fetch steps (authored content)
  // Note: Using type assertion due to regenerated types not including all columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: steps, error: stepsError } = await (supabase as any)
    .from('steps')
    .select('*')
    .eq('tutorial_id', id)
    .order('order_index', { ascending: true });

  if (stepsError) {
    console.error('Failed to fetch steps:', stepsError);
    // Don't throw - steps table might be empty
  }

  // 6. Generate signed URLs for sources
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourcesWithSignedUrls: SourceWithSignedUrl[] = await Promise.all(
    (sources || []).map(async (source: any) => {
      let signedScreenshotUrl: string | null = null;

      if (source.screenshot_url) {
        const { data: signedUrl } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(source.screenshot_url, 3600);

        signedScreenshotUrl = signedUrl?.signedUrl || null;
      }

      // Parse element_info from JSON if present
      const element_info = source.element_info
        ? (typeof source.element_info === 'string'
            ? JSON.parse(source.element_info)
            : source.element_info as ElementInfo)
        : null;

      return {
        ...source,
        signedScreenshotUrl,
        element_info,
      };
    })
  );

  // 7. Build steps with source data
  const sourcesMap = new Map(sourcesWithSignedUrls.map(s => [s.id, s]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepsWithSources: StepWithSignedUrl[] = (steps || []).map((step: any) => {
    const source = step.source_id ? sourcesMap.get(step.source_id) : null;

    // Parse annotations from JSON if present
    const annotations = step.annotations
      ? (step.annotations as unknown as Annotation[])
      : undefined;

    return {
      id: step.id,
      tutorial_id: step.tutorial_id,
      source_id: step.source_id,
      order_index: step.order_index,
      text_content: step.text_content,
      step_type: step.step_type || 'text',
      annotations,
      created_at: step.created_at,
      // From joined source
      signedScreenshotUrl: source?.signedScreenshotUrl || null,
      source: source || null,
      // Legacy fields for compatibility
      click_x: source?.click_x || null,
      click_y: source?.click_y || null,
      viewport_width: source?.viewport_width || null,
      viewport_height: source?.viewport_height || null,
      element_info: source?.element_info || null,
    };
  });

  // 8. Generate signed URL for audio
  const audioPath = `${tutorial.user_id}/${tutorial.id}.webm`;
  const { data: audioSignedUrl } = await supabase.storage
    .from('recordings')
    .createSignedUrl(audioPath, 3600);

  return (
    <EditorClient
      initialTutorial={tutorial}
      initialSources={sourcesWithSignedUrls}
      initialSteps={stepsWithSources}
      audioUrl={audioSignedUrl?.signedUrl || null}
    />
  );
}
