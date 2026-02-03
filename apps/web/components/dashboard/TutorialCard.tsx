'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MoreVertical, Pencil, Share2, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface TutorialCardProps {
  id: string;
  title: string;
  status: 'draft' | 'processing' | 'ready' | 'error';
  stepsCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-700',
  },
  processing: {
    label: 'En cours...',
    variant: 'default' as const,
    className: 'bg-yellow-100 text-yellow-700',
  },
  ready: {
    label: 'Prêt',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-700',
  },
  error: {
    label: 'Erreur',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-700',
  },
};

export function TutorialCard({
  id,
  title,
  status,
  stepsCount,
  thumbnailUrl,
  createdAt,
  onEdit,
  onDelete,
  onShare,
}: TutorialCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusInfo = statusConfig[status];

  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-100">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Status Badge */}
          <Badge className={`absolute left-2 top-2 ${statusInfo.className}`}>
            {status === 'processing' && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            {statusInfo.label}
          </Badge>

          {/* Actions Menu */}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white/90 hover:bg-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="truncate font-medium text-gray-900">{title}</h3>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <span>{stepsCount} étape{stepsCount !== 1 ? 's' : ''}</span>
            <span>{formattedDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le tutoriel</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{title}&quot; ? Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
