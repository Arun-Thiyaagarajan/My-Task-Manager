'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowRight,
  Bug,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wrench,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReleaseAudience, ReleaseItemType, ReleaseUpdate } from '@/lib/types';

interface ReleaseNotesDialogProps {
  release: ReleaseUpdate | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const releaseTypeMeta: Record<ReleaseItemType, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: { label: 'Features', icon: Sparkles, className: 'text-primary' },
  improvement: { label: 'Improvements', icon: Wrench, className: 'text-amber-500' },
  fix: { label: 'Bug fixes', icon: Bug, className: 'text-rose-500' },
  security: { label: 'Security', icon: ShieldCheck, className: 'text-emerald-500' },
};

const audienceMeta: Record<ReleaseAudience, { label: string; icon: typeof Monitor }> = {
  desktop: { label: 'Desktop', icon: Monitor },
  mobile: { label: 'Mobile', icon: Smartphone },
  both: { label: 'Desktop + Mobile', icon: Monitor },
};

export function ReleaseNotesDialog({ release, isOpen, onOpenChange }: ReleaseNotesDialogProps) {
  const router = useRouter();

  if (!release) return null;

  const groupedItems = (['feature', 'improvement', 'fix', 'security'] as ReleaseItemType[])
    .map((type) => ({
      type,
      items: release.items.filter((item) => item.type === type),
    }))
    .filter((group) => group.items.length > 0);

  const handleNavigateHistory = () => {
    onOpenChange(false);
    window.dispatchEvent(new Event('navigation-start'));
    router.push('/releases');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="w-[min(44rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.75rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.96))] p-0 text-foreground shadow-[0_32px_90px_-40px_rgba(15,23,42,0.48)] dark:shadow-[0_32px_90px_-40px_rgba(0,0,0,0.72)]"
      >
        <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_50%),linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--foreground)/0.02))] 
        dark:bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.25),transparent_40%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.9))] px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="absolute -right-5 -top-8 opacity-10">
            <Sparkles className="h-28 w-28 rotate-12" />
          </div>
          <DialogHeader className="relative space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/12">
                v{release.version}
              </Badge>
              <Badge className="border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-white/90 hover:bg-white/8">
                {format(new Date(release.publishedAt || release.date), 'MMM d, yyyy')}
              </Badge>
              <Badge className="border-white/15 bg-primary/30 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-primary/30">
                New release
              </Badge>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-left text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {release.title}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-left text-sm leading-relaxed text-white/78 sm:text-[15px]">
                {release.description || 'A new update is now live for your workspace.'}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[min(70vh,34rem)] overflow-y-auto px-5 py-5 sm:px-7">
          <div className="space-y-6">
            {groupedItems.map((group) => {
              const meta = releaseTypeMeta[group.type];
              const Icon = meta.icon;

              return (
                <section key={group.type} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-muted/50', meta.className)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const audience = audienceMeta[item.audience || 'both'];
                      const AudienceIcon = audience.icon;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'rounded-[1.15rem] border border-border/60 bg-card/95 p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.24)] transition-colors dark:bg-card/90 dark:shadow-[0_16px_36px_-28px_rgba(0,0,0,0.55)]',
                            item.link && 'cursor-pointer hover:border-primary/25 hover:bg-primary/[0.03]'
                          )}
                          onClick={() => {
                            if (!item.link) return;
                            onOpenChange(false);
                            window.dispatchEvent(new Event('navigation-start'));
                            router.push(item.link);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="rounded-full border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                                  <AudienceIcon className="mr-1.5 h-3 w-3" />
                                  {audience.label}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium leading-6 text-foreground">
                                {item.text}
                              </p>
                            </div>
                            {item.link ? <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-4 sm:px-7">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-medium">
            Dismiss
          </Button>
          <Button onClick={handleNavigateHistory} className="rounded-xl px-5 font-semibold">
            View release history
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
