'use client';

import Link from 'next/link';
import { Settings2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StarterWorkspaceCalloutProps {
  isVisible: boolean;
}

export function StarterWorkspaceCallout({ isVisible }: StarterWorkspaceCalloutProps) {
  if (!isVisible) return null;

  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background to-primary/[0.03] shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Starter workspace active
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">
                Sample tasks and views are still visible while you explore.
              </h3>
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
                When you are ready for a clean workspace, open Settings and use Clear starter defaults. This message disappears automatically after that.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button asChild className="h-10 rounded-xl px-4 font-medium shadow-sm">
              <Link href="/settings?section=data&highlight=starter-cleanup">
                <Settings2 className="mr-2 h-4 w-4" />
                Open Settings
              </Link>
            </Button>
            <p className="text-[11px] leading-5 text-muted-foreground sm:max-w-[15rem] sm:text-right">
              Find the cleanup action in Settings under the danger zone.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
