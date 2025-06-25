'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPullRequest } from 'lucide-react';
import type { Task, Repository } from '@/lib/types';
import { ENVIRONMENTS } from '@/lib/constants';
import { Badge } from './ui/badge';

interface PrLinksGroupProps {
  prLinks: Task['prLinks'];
  repositories: Repository[];
}

export function PrLinksGroup({ prLinks, repositories }: PrLinksGroupProps) {
  const baseUrl = 'https://dev.azure.com/ideaelan/Infinity/_git/';

  return (
    <Tabs defaultValue="dev" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        {ENVIRONMENTS.map((env) => (
          <TabsTrigger key={env} value={env} className="capitalize">
            {env}
          </TabsTrigger>
        ))}
      </TabsList>
      {ENVIRONMENTS.map((env) => {
        const repoPrMap = prLinks[env];
        const hasAnyLinkForEnv =
          repoPrMap &&
          repositories.some((repo) => {
            const prIdString = repoPrMap[repo] || '';
            return prIdString.trim().length > 0;
          });

        return (
          <TabsContent key={env} value={env}>
            <div className="mt-4">
              {hasAnyLinkForEnv ? (
                <div className="space-y-4">
                  {repositories.map((repo) => {
                    const prIdString = repoPrMap?.[repo] || '';
                    const prIds = prIdString.split(',').map((id) => id.trim()).filter(Boolean);
                    
                    if (prIds.length === 0) {
                        return null;
                    }

                    return (
                      <div key={repo}>
                        <h4 className="font-semibold mb-2 text-sm text-foreground">{repo}</h4>
                        <div className="flex flex-wrap gap-2">
                          {prIds.map((id) => {
                            const url = `${baseUrl}${repo}/pullrequest/${id}`;
                            return (
                              <a
                                key={`${repo}-${id}`}
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
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No pull request links for the{' '}
                  <span className="capitalize font-medium">{env}</span>{' '}
                  environment.
                </p>
              )}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
