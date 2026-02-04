'use client';

import Link from 'next/link';
import { ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import type { SaveStatus } from './EditorClient';

interface DocHeaderProps {
  saveStatus: SaveStatus;
}

export function DocHeader({ saveStatus }: DocHeaderProps) {
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sauvegarde...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-4 w-4" />
            <span>Sauvegardé</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Erreur</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Retour</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {renderSaveStatus()}
        </div>
      </div>
    </header>
  );
}
