
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Rocket, Zap, Bug, ArrowRight, ExternalLink } from 'lucide-react';
import type { ReleaseUpdate, ReleaseItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ReleaseNotesDialogProps {
  release: ReleaseUpdate | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReleaseNotesDialog({ release, isOpen, onOpenChange }: ReleaseNotesDialogProps) {
  const router = useRouter();

  if (!release) return null;

  const handleAction = (link: string) => {
    onOpenChange(false);
    router.push(link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Rocket className="h-4 w-4 text-primary" />;
      case 'improvement': return <Zap className="h-4 w-4 text-amber-500" />;
      case 'fix': return <Bug className="h-4 w-4 text-red-500" />;
      default: return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 border-none shadow-2xl flex flex-col">
        {/* Header Section - Static */}
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-32 w-32 rotate-12" />
            </div>
            <div className="relative z-10 space-y-2">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    v{release.version} • {format(new Date(release.date), 'MMM d, yyyy')}
                </Badge>
                <DialogTitle className="text-4xl font-extrabold tracking-tight">What's New in TaskFlow</DialogTitle>
                <DialogDescription className="text-primary-foreground/80 text-lg font-medium">
                    {release.title}
                </DialogDescription>
            </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full px-8 py-6">
                {release.description && (
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        {release.description}
                    </p>
                )}

                <div className="space-y-8">
                    {['feature', 'improvement', 'fix'].map(type => {
                        const items = release.items.filter(i => i.type === type);
                        if (items.length === 0) return null;

                        return (
                            <div key={type} className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    {getIcon(type)}
                                    {type === 'feature' ? 'New Features' : type === 'improvement' ? 'Improvements' : 'Bug Fixes'}
                                </h3>
                                <div className="grid gap-3">
                                    {items.map(item => (
                                        <div 
                                            key={item.id} 
                                            className={cn(
                                                "group p-4 rounded-xl border bg-card transition-all duration-300",
                                                item.link && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                                            )}
                                            onClick={() => item.link && handleAction(item.link)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold leading-none group-hover:text-primary transition-colors">
                                                        {item.text}
                                                    </p>
                                                    {item.link && (
                                                        <span className="text-[10px] text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View feature <ArrowRight className="h-2.5 w-2.5" />
                                                        </span>
                                                    )}
                                                </div>
                                                {item.imageUrl && (
                                                    <div className="h-12 w-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden border">
                                                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>

        {/* Footer Section - Static */}
        <DialogFooter className="px-8 py-6 bg-muted/30 border-t sm:justify-between items-center gap-4 shrink-0">
            <p className="text-xs text-muted-foreground">
                Thank you for using TaskFlow!
            </p>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Dismiss</Button>
                <Button onClick={() => onOpenChange(false)}>Got it!</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
