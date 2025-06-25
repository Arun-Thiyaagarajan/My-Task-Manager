'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPullRequest } from 'lucide-react';
import type { Task, Repository } from '@/lib/types';
import { ENVIRONMENTS } from '@/lib/constants';
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface PrLinksGroupProps {
  prLinks: Task['prLinks'];
  repositories: Repository[];
}

export function PrLinksGroup({ prLinks, repositories }: PrLinksGroupProps) {
  const baseUrl = 'https://dev.azure.com/ideaelan/Infinity/_git/';

  if (!repositories || repositories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No repositories have been selected for this task.
      </p>
    );
  }

  const reposWithLinks = repositories.filter((repo) =>
    ENVIRONMENTS.some((env) => (prLinks[env]?.[repo] || '').trim().length > 0)
  );

  if (reposWithLinks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No pull request links have been added for this task.
      </p>
    );
  }

  return (
    <Tabs defaultValue={reposWithLinks[0]} className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <TabsList>
          {reposWithLinks.map((repo) => (
            <TabsTrigger key={repo} value={repo}>
              {repo}
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {reposWithLinks.map((repo) => (
        <TabsContent key={repo} value={repo}>
          <div className="mt-4 space-y-4">
            {ENVIRONMENTS.map((env) => {
              const prIdString = prLinks[env]?.[repo] || '';
              const prIds = prIdString
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean);

              if (prIds.length === 0) {
                return null;
              }

              return (
                <div key={env}>
                  <h4 className="font-semibold mb-2 text-sm text-foreground capitalize">
                    {env}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {prIds.map((id) => {
                      const url = `${baseUrl}${repo}/pullrequest/${id}`;
                      return (
                        <a
                          key={`${repo}-${env}-${id}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Badge
                            variant="outline"
                            className="font-normal py-1 px-2.5 hover:bg-accent"
                          >
                            <GitPullRequest className="h-3 w-3 mr-1.5 text-muted-foreground" />
                            <span>PR #{id}</span>
                          </Badge>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
