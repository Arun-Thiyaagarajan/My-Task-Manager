'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPullRequest } from 'lucide-react';
import type { Task } from '@/lib/types';
import { ENVIRONMENTS } from '@/lib/constants';
import { Badge } from './ui/badge';

interface PrLinksGroupProps {
  prLinks: Task['prLinks'];
}

export function PrLinksGroup({ prLinks }: PrLinksGroupProps) {
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
        const linksForEnv = prLinks[env] || [];
        return (
          <TabsContent key={env} value={env}>
            <div className="mt-4">
              {linksForEnv.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {linksForEnv.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge
                        variant="outline"
                        className="font-normal py-1 px-2.5 hover:bg-accent"
                      >
                        <GitPullRequest className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        <span className="truncate max-w-xs">
                          {url.replace(/^https?:\/\//, '')}
                        </span>
                      </Badge>
                    </a>
                  ))}
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
