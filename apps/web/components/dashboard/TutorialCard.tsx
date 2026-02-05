'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Pencil, Share2, Trash2, Loader2, Play, ImageIcon, Globe, GlobeLock, Clock, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import { ShareDialog } from './ShareDialog';

export interface TutorialCardProps {
  id: string;
  title: string;
  slug?: string | null;
  status: 'draft' | 'processing' | 'ready' | 'error';
  visibility?: string;
  stepsCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
  onProcess?: () => Promise<void>;
}

const publishedConfig = {
  published: {
    label: 'Publié',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600',
    icon: Globe,
  },
  notPublished: {
    label: 'Brouillon',
    dotClass: 'bg-muted-foreground/50',
    textClass: 'text-muted-foreground',
    icon: GlobeLock,
  },
};

export function TutorialCard({
  id,
  title,
  slug,
  status,
  visibility,
  stepsCount,
  thumbnailUrl,
  createdAt,
  onEdit,
  onDelete,
  onShare,
  onProcess,
}: TutorialCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isPublished = visibility === 'link_only' || visibility === 'public';
  const publishInfo = isPublished ? publishedConfig.published : publishedConfig.notPublished;
  const PublishIcon = publishInfo.icon;

  const handleProcess = async () => {
    if (!onProcess) return;
    setIsProcessing(true);
    try {
      await onProcess();
    } finally {
      setIsProcessing(false);
    }
  };

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
      <Card 
        className="group relative overflow-hidden border border-border/60 bg-card transition-all duration-200 hover:border-border hover:shadow-md cursor-pointer" 
        onClick={onEdit}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] bg-muted/50">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="rounded-xl bg-muted p-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </div>
          )}

          {/* Process Button - Only show for processing status */}
          {status === 'processing' && onProcess && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                size="sm"
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Finaliser
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Actions Menu */}
          <div
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground leading-tight line-clamp-2">{title}</h3>
          </div>
          
          <div className="flex items-center justify-between">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${publishInfo.dotClass}`} />
              <span className={`text-xs font-medium ${publishInfo.textClass}`}>
                {publishInfo.label}
              </span>
            </div>
            
            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {stepsCount}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
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

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        tutorialId={id}
        tutorialTitle={title}
        tutorialSlug={slug || null}
      />
    </>
  );
}
