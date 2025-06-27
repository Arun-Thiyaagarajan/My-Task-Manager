'use client';

import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getUiConfig } from '@/lib/data';
import { useState, useEffect } from 'react';

interface EnvironmentStatusProps {
  deploymentStatus: Task['deploymentStatus'];
  deploymentDates?: Task['deploymentDates'];
  size?: 'sm' | 'default';
}

export function EnvironmentStatus({ deploymentStatus, deploymentDates, size = 'default' }: EnvironmentStatusProps) {
    const [configuredEnvs, setConfiguredEnvs] = useState<string[]>([]);
    
    useEffect(() => {
        const uiConfig = getUiConfig();
        if (uiConfig?.environments) {
            setConfiguredEnvs(uiConfig.environments);
        }
    }, []);


  const getEnvInfo = (env: string) => {
    switch(env) {
      case 'dev':
        return { 
          deployedColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80',
          pendingColor: 'border-dashed text-blue-600/80 border-blue-400/50 dark:text-blue-400/70 dark:border-blue-500/30 bg-background hover:bg-blue-500/5',
          label: 'Development' 
        };
      case 'stage':
        return { 
          deployedColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700/80',
          pendingColor: 'border-dashed text-amber-600/80 border-amber-400/50 dark:text-amber-400/70 dark:border-amber-500/30 bg-background hover:bg-amber-500/5',
          label: 'Staging'
         };
      case 'production':
        return { 
          deployedColor: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80',
          pendingColor: 'border-dashed text-green-600/80 border-green-400/50 dark:text-green-400/70 dark:border-green-500/30 bg-background hover:bg-green-500/5',
          label: 'Production'
         };
      default:
        return { 
          deployedColor: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/80',
          pendingColor: 'border-dashed text-gray-500 border-gray-300 dark:text-gray-400 dark:border-gray-600 bg-background hover:bg-gray-500/5',
          label: env
        };
    }
  }
  
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-wrap items-center gap-1.5">
        {configuredEnvs.map(env => {
          const envInfo = getEnvInfo(env);
          const isSelected = deploymentStatus?.[env] ?? false;
          const hasDate = deploymentDates && deploymentDates[env];
          const isDeployed = isSelected && (env === 'dev' || !!hasDate);
          
          const tooltipText = isDeployed ? "Deployed" : "Pending";

          return (
            <Tooltip key={env}>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize font-medium transition-colors',
                    isDeployed
                      ? envInfo.deployedColor
                      : envInfo.pendingColor,
                    size === 'sm' && 'px-1.5 py-0 text-[10px] h-4'
                  )}
                >
                  {env}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">{envInfo.label}: {tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
