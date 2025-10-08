
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPullRequest, Plus, X, Pencil, Copy, Check } from 'lucide-react';
import type { Task, Repository, RepositoryConfig } from '@/lib/types';
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import cloneDeep from 'lodash/cloneDeep';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
  const repoConfigMap = new Map((repositoryConfigs || []).map(rc => [rc.name, rc]));
  
  const displayRepos = Array.isArray(repositories) ? repositories : (repositories ? [repositories] : []);

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

  if (!displayRepos || displayRepos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No repositories are assigned to this task.
      </p>
    );
  }

  const allEnvs = configuredEnvs || [];
  
  if (allEnvs.length === 0) {
     return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No environments configured.
      </p>
    );
  }

  return (
    <div className="w-full">
        <Tabs defaultValue={displayRepos[0]} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
            <TabsList>
            {displayRepos.map((repo) => (
                <TabsTrigger key={repo} value={repo}>
                {repo}
                </TabsTrigger>
            ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
        {displayRepos.map((repo) => {
            const repoConfig = repoConfigMap.get(repo);
            
            const linksForRepo = allEnvs.map(env => {
                const prIdString = prLinks?.[env]?.[repo] || '';
                const prIds = prIdString.split(',').map((id) => id.trim()).filter(Boolean);
                
                return { env, prIds };
            });

            return (
                <TabsContent key={repo} value={repo}>
                <div className="mt-4 space-y-4">
                    {linksForRepo.map(({ env, prIds }) => (
                        <div key={env}>
                        <h4 className="font-semibold mb-2 text-sm text-foreground capitalize">
                            {env}
                        </h4>
                        {prIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                            {prIds.map((id) => {
                                const baseUrl = repoConfig ? repoConfig.baseUrl : '';
                                const canBeLinked = baseUrl && id;
                                const url = canBeLinked ? `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${id}` : '#';

                                return (
                                <Badge
                                    key={`${repo}-${env}-${id}`}
                                    variant="outline"
                                    className={cn(
                                    "font-normal py-1 px-2.5 group/badge relative hover:bg-muted/50 transition-all duration-300",
                                    !isEditing && "pr-2.5 hover:pr-8"
                                    )}
                                >
                                    <div className="flex items-center">
                                      <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                              "flex items-center gap-1.5",
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
                                        <div className="absolute top-1/2 -translate-y-1/2 right-1.5 flex items-center justify-center opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCopy(url);}}
                                                className="h-full w-full flex items-center justify-center text-muted-foreground hover:text-foreground"
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
                                          className="ml-1 rounded-full p-0.5 opacity-50 group-hover/badge:opacity-100 hover:!opacity-100 hover:bg-destructive/20 transition-opacity"
                                      >
                                          <X className="h-3 w-3 text-destructive" />
                                      </button>
                                      )}
                                    </div>
                                </Badge>
                                );
                            })}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-xs italic">No PRs for this environment.</p>
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
    </div>
  );
}
