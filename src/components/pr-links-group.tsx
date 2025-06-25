'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPullRequest } from 'lucide-react';
import type { Task, Repository } from '@/lib/types';
import { ENVIRONMENTS } from '@/lib/constants';

interface PrLinksGroupProps {
  prLinks: Task['prLinks'];
  repositories: Repository[];
}

export function PrLinksGroup({ prLinks, repositories }: PrLinksGroupProps) {
  const prBaseUrl = 'https://dev.azure.com/ideaelan/Infinity/_git/';

  return (
    <Tabs defaultValue="dev" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        {ENVIRONMENTS.map(env => (
            <TabsTrigger key={env} value={env} className="capitalize">{env}</TabsTrigger>
        ))}
      </TabsList>
      {ENVIRONMENTS.map(env => {
        const allPrLinks = repositories.flatMap(repo => 
            (prLinks[env] || []).map(prId => ({
                repo,
                prId,
                url: `${prBaseUrl}${repo}/pullrequest/${prId}`
            }))
        );

        return (
        <TabsContent key={env} value={env}>
          <div className="mt-4 space-y-3">
            {allPrLinks.length > 0 ? (
              allPrLinks.map(({repo, prId, url}, index) => (
                <div key={index} className="flex items-center gap-3">
                  <GitPullRequest className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline underline-offset-4 truncate"
                  >
                    {repo}/pullrequest/{prId}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No pull request links for the <span className="capitalize font-medium">{env}</span> environment.
              </p>
            )}
          </div>
        </TabsContent>
      )})}
    </Tabs>
  );
}
