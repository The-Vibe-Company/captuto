'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, FileText, Plus, RefreshCw, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TutorialCard, TutorialCardProps } from '@/components/dashboard/TutorialCard';
import { TutorialCardSkeleton } from '@/components/dashboard/TutorialCardSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';

type Tutorial = Omit<TutorialCardProps, 'onEdit' | 'onDelete' | 'onShare'>;

async function fetchTutorials(): Promise<Tutorial[]> {
  const response = await fetch('/api/tutorials');
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('Failed to fetch tutorials');
  }
  const data = await response.json();
  return data.tutorials;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: tutorials = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tutorials'],
    queryFn: fetchTutorials,
  });

  const deleteMutation = useMutation({
    mutationFn: async (tutorialId: string) => {
      const response = await fetch(`/api/tutorials/${tutorialId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete tutorial');
      }
      return tutorialId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Tutorial[]>(['tutorials'], (old) =>
        old?.filter((t) => t.id !== deletedId) ?? []
      );
    },
  });

  const handleEdit = (tutorialId: string) => {
    router.push(`/editor/${tutorialId}`);
  };

  const handleDelete = async (tutorialId: string) => {
    await deleteMutation.mutateAsync(tutorialId);
  };

  // Redirect to login on unauthorized error
  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') {
      router.push('/login');
    }
  }, [error, router]);

  // Show nothing while redirecting to login
  if (error?.message === 'UNAUTHORIZED') {
    return null;
  }

  if (error) {
    return (
      <Card className="border-red-100">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="mb-4 text-red-600">{error.message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tutorials' },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
              Your tutorials
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Review recordings, finish drafts, and publish polished guides.
            </p>
          </div>
          {!loading && tutorials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <DashboardStat
                icon={FileText}
                label="Total"
                value={tutorials.length}
              />
              <DashboardStat
                icon={CheckCircle2}
                label="Published"
                value={tutorials.filter((tutorial) => tutorial.visibility === 'link_only' || tutorial.visibility === 'public').length}
              />
              <DashboardStat
                icon={Clock3}
                label="Drafts"
                value={tutorials.filter((tutorial) => tutorial.visibility !== 'link_only' && tutorial.visibility !== 'public').length}
              />
            </div>
          )}
        </div>

        {deleteMutation.isError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Could not delete the tutorial. Please try again.
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <TutorialCardSkeleton key={i} />
            ))}
          </div>
        ) : tutorials.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <Plus className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-stone-900">
                No tutorials yet
              </h2>
              <p className="mt-2 max-w-md text-stone-500">
                Start a recording from the browser extension or desktop recorder.
                Your captured workflow will appear here for editing and sharing.
              </p>
              <Button asChild className="mt-6 gap-2">
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  Connect a recorder
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tutorials.map((tutorial) => (
              <TutorialCard
                key={tutorial.id}
                {...tutorial}
                onEdit={() => handleEdit(tutorial.id)}
                onDelete={() => handleDelete(tutorial.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <Badge variant="outline" className="gap-2 rounded-lg px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-stone-500" />
      <span className="text-stone-500">{label}</span>
      <span className="font-semibold text-stone-900">{value}</span>
    </Badge>
  );
}
