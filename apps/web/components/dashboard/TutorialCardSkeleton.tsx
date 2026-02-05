import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TutorialCardSkeleton() {
  return (
    <Card className="overflow-hidden border border-border/60">
      {/* Thumbnail */}
      <Skeleton className="aspect-[16/10] w-full rounded-none" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-4/5" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}
