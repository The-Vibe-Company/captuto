'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, FileVideo, Chrome, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TutorialCard, TutorialCardProps } from '@/components/dashboard/TutorialCard';
import { TutorialCardSkeleton } from '@/components/dashboard/TutorialCardSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Tutorial = Omit<TutorialCardProps, 'onEdit' | 'onDelete' | 'onShare' | 'onProcess'>;

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
      // Optimistically update the cache
      queryClient.setQueryData<Tutorial[]>(['tutorials'], (old) =>
        old?.filter((t) => t.id !== deletedId) ?? []
      );
    },
    onError: (err) => {
      console.error('Delete error:', err);
    },
  });

  const processMutation = useMutation({
    mutationFn: async (tutorialId: string) => {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tutorialId }),
      });
      if (!response.ok) {
        throw new Error('Failed to process tutorial');
      }
      const data = await response.json();
      return { tutorialId, status: data.status || 'ready' };
    },
    onSuccess: ({ tutorialId, status }) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tutorial[]>(['tutorials'], (old) =>
        old?.map((t) => (t.id === tutorialId ? { ...t, status } : t)) ?? []
      );
    },
    onError: (err) => {
      console.error('Process error:', err);
    },
  });

  const handleEdit = (tutorialId: string) => {
    router.push(`/editor/${tutorialId}`);
  };

  const handleDelete = (tutorialId: string) => {
    deleteMutation.mutate(tutorialId);
  };

  const handleProcess = async (tutorialId: string) => {
    await processMutation.mutateAsync(tutorialId);
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
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Card className="border-destructive/20 bg-destructive/5">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Une erreur est survenue</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reessayer
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mes tutoriels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez et partagez vos tutoriels enregistres
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TutorialCardSkeleton key={i} />
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/30">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileVideo className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Creez votre premier tutoriel
            </h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Utilisez l&apos;extension Chrome pour enregistrer vos actions et generer automatiquement un tutoriel.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm">
                <Chrome className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Extension Vibe Tuto</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Commencer l&apos;enregistrement</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              {...tutorial}
              onEdit={() => handleEdit(tutorial.id)}
              onDelete={() => handleDelete(tutorial.id)}
              onProcess={() => handleProcess(tutorial.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
