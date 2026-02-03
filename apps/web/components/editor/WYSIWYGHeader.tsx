'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Loader2, Check, AlertCircle } from 'lucide-react';
import type { SaveStatus } from './EditorClient';

interface WYSIWYGHeaderProps {
  saveStatus: SaveStatus;
  onPreview: () => void;
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
      return (
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Sauvegarde...
        </span>
      );
    case 'saved':
      return (
        <span className="flex items-center gap-1.5 text-sm text-green-600">
          <Check className="h-3.5 w-3.5" />
          Sauvegardé
        </span>
      );
    case 'unsaved':
      return (
        <span className="flex items-center gap-1.5 text-sm text-amber-600">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Non sauvegardé
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          Erreur
        </span>
      );
  }
}

export function WYSIWYGHeader({ saveStatus, onPreview }: WYSIWYGHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 backdrop-blur-sm px-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <Button variant="outline" size="sm" onClick={onPreview}>
        <Eye className="mr-2 h-4 w-4" />
        Aperçu
      </Button>
    </header>
  );
}
