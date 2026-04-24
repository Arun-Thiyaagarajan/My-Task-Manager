

'use client';

import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPullRequest, Plus, X, Copy, Check } from 'lucide-react';
import type { Task, Repository, RepositoryConfig } from '@/lib/types';
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import cloneDeep from 'lodash/cloneDeep';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface PrLinksGroupProps {
  prLinks: Task['prLinks'];
  repositories: Repository[] | undefined;
  configuredEnvs: string[] | undefined;
  repositoryConfigs: RepositoryConfig[];
  onUpdate?: (newPrLinks: Task['prLinks']) => void;
  isEditing: boolean;
}

export function PrLinksGroup({ prLinks, repositories, configuredEnvs, repositoryConfigs, onUpdate, isEditing }: PrLinksGroupProps) {
  const [newPrIds, setNewPrIds] = useState<Record<string, Record<string, string>>>({});
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<string>('');
  const [overflowDialog, setOverflowDialog] = useState<{ repo: string; env: string; prIds: string[] } | null>(null);
  const tabsViewportRef = useRef<HTMLDivElement | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const repoConfigMap = new Map((repositoryConfigs || []).map(rc => [rc.name, rc]));
  
  const displayRepos = Array.isArray(repositories) ? repositories : [];
  const allEnvs = configuredEnvs || [];
  const inlineVisibleCount = isEditing ? Number.POSITIVE_INFINITY : (isMobile ? 1 : 2);
  const currentRepo = activeRepo || displayRepos[0] || '';

  useEffect(() => {
    const viewport = tabsViewportRef.current;
    if (!viewport || displayRepos.length === 0) return;

    const updateOverflowIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = viewport;
      const maxScrollLeft = Math.max(scrollWidth - clientWidth, 0);
      setShowLeftFade(scrollLeft > 6);
      setShowRightFade(maxScrollLeft - scrollLeft > 6);
    };

    updateOverflowIndicators();
    viewport.addEventListener('scroll', updateOverflowIndicators, { passive: true });
    window.addEventListener('resize', updateOverflowIndicators);

    return () => {
      viewport.removeEventListener('scroll', updateOverflowIndicators);
      window.removeEventListener('resize', updateOverflowIndicators);
    };
  }, [displayRepos.length]);

  useEffect(() => {
    if (displayRepos.length === 0) {
      setActiveRepo('');
      return;
    }

    setActiveRepo((current) => (current && displayRepos.includes(current) ? current : displayRepos[0]));
  }, [displayRepos]);

  if (!displayRepos || displayRepos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No repositories are assigned to this task.
      </p>
    );
  }
  
  if (allEnvs.length === 0) {
     return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No environments configured.
      </p>
    );
  }

  const handleRemovePr = (repo: string, env: string, prIdToRemove: string) => {
    if (!onUpdate) return;
    
    const newLinks = cloneDeep(prLinks) || {};
    if (newLinks[env] && newLinks[env]?.[repo]) {
      const currentIds = newLinks[env]![repo].split(',').map(s => s.trim()).filter(Boolean);
      const updatedIds = currentIds.filter(id => id !== prIdToRemove);
      newLinks[env]![repo] = updatedIds.join(', ');
    }
    
    onUpdate(newLinks);
  };
  
  const handleAddPr = (repo: string, env: string) => {
    if (!onUpdate) return;
    
    const idsToAdd = (newPrIds[repo]?.[env] || '').split(/[\s,]+/).filter(Boolean);
    if (idsToAdd.length === 0) return;
    
    const newLinks = cloneDeep(prLinks) || {};
    if (!newLinks[env]) {
      newLinks[env] = {};
    }
    
    const currentIds = (newLinks[env]?.[repo] || '').split(',').map(s => s.trim()).filter(Boolean);
    const updatedIds = [...new Set([...currentIds, ...idsToAdd])];
    newLinks[env]![repo] = updatedIds.join(', ');
    
    onUpdate(newLinks);

    // Reset input
    setNewPrIds(prev => {
        const updated = cloneDeep(prev);
        if (updated[repo]) {
            updated[repo][env] = '';
        }
        return updated;
    });
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(url);
        toast({ variant: 'success', title: 'Copied to clipboard!', duration: 2000 });
        setTimeout(() => setCopiedUrl(null), 2000);
    }).catch(() => {
        toast({ variant: 'destructive', title: 'Failed to copy' });
    });
  };

  const renderPrBadge = (repo: string, env: string, id: string, index: number) => {
    const repoConfig = repoConfigMap.get(repo);
    const baseUrl = repoConfig ? repoConfig.baseUrl : '';
    const canBeLinked = baseUrl && id;
    const url = canBeLinked ? `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${id}` : '#';

    return (
      <Badge
        key={`${repo}-${env}-${id}-${index}`}
        variant="outline"
        className={cn(
          "group/badge relative overflow-hidden rounded-full border-border/55 bg-background/[0.7] py-1.5 pl-3 pr-3 font-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,border-color,box-shadow,padding] duration-200 hover:border-border/75 hover:bg-background/[0.82] hover:shadow-[0_10px_24px_-22px_rgba(15,23,42,0.28)]",
          !isEditing && "hover:pr-[2.2rem]"
        )}
      >
        <div className="flex items-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1.5 text-foreground/88 transition-colors duration-200 group-hover/badge:text-foreground",
              !canBeLinked && "cursor-default"
            )}
            onClick={(e) => {
              if (isEditing || !canBeLinked) {
                e.preventDefault();
              }
            }}
          >
            <GitPullRequest className="h-3 w-3 text-muted-foreground" />
            <span>PR #{id}</span>
          </a>
          {!isEditing && canBeLinked && (
            <div className="absolute right-[0.38rem] top-1/2 flex -translate-y-1/2 translate-x-1 items-center justify-center opacity-0 transition-[opacity,transform] duration-200 group-hover/badge:translate-x-0 group-hover/badge:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(url);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent bg-background/75 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-border/60 hover:bg-background hover:text-foreground"
              >
                {copiedUrl === url ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">Copy link</span>
              </button>
            </div>
          )}
          {isEditing && (
            <button
              onClick={() => handleRemovePr(repo, env, id)}
              className="ml-1 rounded-full p-0.5 opacity-50 transition-opacity hover:!opacity-100 hover:bg-destructive/20 group-hover/badge:opacity-100"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          )}
        </div>
      </Badge>
    );
  };

  return (
    <div className="w-full">
        <Tabs value={currentRepo} onValueChange={setActiveRepo} className="w-full">
        <div className="relative inline-block max-w-full overflow-hidden rounded-[1.05rem] border border-border/55 bg-muted/[0.38] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-1.5 left-1.5 z-10 w-8 rounded-l-[0.95rem] bg-gradient-to-r from-background/[0.92] via-background/[0.72] to-transparent transition-opacity duration-200",
              showLeftFade ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-1.5 right-1.5 z-10 w-8 rounded-r-[0.95rem] bg-gradient-to-l from-background/[0.92] via-background/[0.72] to-transparent transition-opacity duration-200",
              showRightFade ? "opacity-100" : "opacity-0"
            )}
          />
          <ScrollArea
            className="max-w-full whitespace-nowrap"
            viewportRef={tabsViewportRef}
          >
            <TabsList className="inline-flex h-auto min-w-max items-center justify-start gap-1 rounded-[0.9rem] bg-transparent p-0 text-muted-foreground">
            {displayRepos.map((repo) => (
                <TabsTrigger
                  key={repo}
                  value={repo}
                  className="h-9 shrink-0 whitespace-nowrap rounded-[0.8rem] border border-transparent px-4 text-[0.95rem] font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow] duration-200 data-[state=active]:border-border/70 data-[state=active]:bg-white/95 data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(15,23,42,0.08),0_12px_24px_-20px_rgba(15,23,42,0.18)] dark:data-[state=active]:border-border/55 dark:data-[state=active]:bg-background dark:data-[state=active]:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_24px_-20px_rgba(15,23,42,0.35)]"
                >
                {repo}
                </TabsTrigger>
            ))}
            </TabsList>
            <ScrollBar
              orientation="horizontal"
              className="hidden"
            />
        </ScrollArea>
        </div>
        {displayRepos.map((repo) => {
            const linksForRepo = allEnvs.map(env => {
                const prIdString = prLinks?.[env]?.[repo] || '';
                const prIds = prIdString.split(',').map((id) => id.trim()).filter(Boolean);
                
                return { env, prIds };
            });

            return (
                <TabsContent key={repo} value={repo}>
                <div className="mt-3.5 space-y-4">
                    {linksForRepo.map(({ env, prIds }) => (
                        <div key={env}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-sm text-foreground capitalize">
                              {env}
                          </h4>
                          <Badge variant="secondary" className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {prIds.length} {prIds.length === 1 ? 'PR' : 'PRs'}
                          </Badge>
                        </div>
                        {prIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                            {prIds.slice(0, inlineVisibleCount).map((id, index) => renderPrBadge(repo, env, id, index))}
                            {!isEditing && prIds.length > inlineVisibleCount && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOverflowDialog({ repo, env, prIds })}
                                className="h-8 rounded-full border-border/60 bg-background/80 px-3 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-background"
                              >
                                +{prIds.length - inlineVisibleCount} more
                              </Button>
                            )}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-xs italic">No Pull request found.</p>
                        )}
                        
                        {isEditing && (
                            <div className="flex items-center gap-2 mt-3 animate-in fade-in-50 duration-300">
                            <Input
                                placeholder="Add PR ID(s), comma separated"
                                className="h-8 text-xs"
                                value={newPrIds[repo]?.[env] || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewPrIds(prev => {
                                        const updated = cloneDeep(prev);
                                        if (!updated[repo]) {
                                            updated[repo] = {};
                                        }
                                        updated[repo][env] = val;
                                        return updated;
                                    });
                                }}
                                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddPr(repo, env)}}}
                            />
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleAddPr(repo, env)} disabled={!(newPrIds[repo]?.[env] || '').trim()}>
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">Add</span>
                            </Button>
                            </div>
                        )}
                        </div>
                    ))}
                    {linksForRepo.length === 0 && !isEditing && (
                        <p className="text-muted-foreground text-sm py-4 text-center">
                            No pull request links have been added for the {repo} repository.
                        </p>
                    )}
                </div>
                </TabsContent>
            )
        })}
        </Tabs>
        <Dialog open={!!overflowDialog} onOpenChange={(open) => !open && setOverflowDialog(null)}>
          <DialogContent className="max-h-[min(82vh,720px)] overflow-hidden rounded-[1.8rem] border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.99),hsl(var(--card)/0.95))] p-0 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.42)] sm:max-w-2xl">
            {overflowDialog ? (
              <>
                <div className="border-b border-border/50 px-6 py-5">
                  <DialogHeader>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <GitPullRequest className="h-5 w-5" />
                      </div>
                      <div>
                        <DialogTitle>{overflowDialog.repo} pull requests</DialogTitle>
                        <DialogDescription>
                          {overflowDialog.env} environment · {overflowDialog.prIds.length} {overflowDialog.prIds.length === 1 ? 'pull request' : 'pull requests'}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                </div>
                <div className="max-h-[min(82vh,520px)] overflow-y-auto px-6 py-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold capitalize text-foreground">{overflowDialog.env}</h4>
                      <Badge variant="secondary" className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {overflowDialog.prIds.length} {overflowDialog.prIds.length === 1 ? 'PR' : 'PRs'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {overflowDialog.prIds.map((id, index) => renderPrBadge(overflowDialog.repo, overflowDialog.env, id, index))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
    </div>
  );
}
