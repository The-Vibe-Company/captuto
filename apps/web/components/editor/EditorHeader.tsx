'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Eye, Loader2, Check, AlertCircle } from 'lucide-react';
import type { SaveStatus } from './EditorClient';

interface EditorHeaderProps {
  title: string;
  isSaving: boolean;
  hasChanges: boolean;
  saveStatus: SaveStatus;
  onSave: () => void;
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

export function EditorHeader({ title, isSaving, hasChanges, saveStatus, onSave, onPreview }: EditorHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <h1 className="text-lg font-semibold truncate max-w-md">{title}</h1>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          Aperçu
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
