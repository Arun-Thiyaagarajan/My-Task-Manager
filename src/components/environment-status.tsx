
'use client';

import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { cn, getEnvInfo } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getUiConfig } from '@/lib/data';
import { useState, useEffect } from 'react';

interface EnvironmentStatusProps {
  deploymentStatus: Task['deploymentStatus'];
  deploymentDates?: Task['deploymentDates'];
  size?: 'sm' | 'default';
  interactive?: boolean;
  onToggle?: (env: string) => void;
  justUpdatedEnv?: string | null;
  onAnimationEnd?: () => void;
}

export function EnvironmentStatus({
  deploymentStatus,
  deploymentDates,
  size = 'default',
  interactive = false,
  onToggle,
  justUpdatedEnv,
  onAnimationEnd,
}: EnvironmentStatusProps) {
  const [configuredEnvs, setConfiguredEnvs] = useState<string[]>([]);

  useEffect(() => {
    const uiConfig = getUiConfig();
    if (uiConfig?.environments) {
      setConfiguredEnvs(uiConfig.environments);
    }
  }, []);

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onAnimationEnd={onAnimationEnd}
    >
      {configuredEnvs.map(env => {
        const envInfo = getEnvInfo(env);
        const isSelected = deploymentStatus?.[env] ?? false;
        const hasDate = deploymentDates && deploymentDates[env];
        const isDeployed = isSelected && (env === 'dev' || !!hasDate);

        const tooltipText = isDeployed ? 'Deployed' : 'Pending';

        const handleClick = (e: React.MouseEvent) => {
          if (interactive && onToggle) {
            e.stopPropagation();
            e.preventDefault();
            onToggle(env);
          }
        };

        return (
          <Tooltip key={env}>
            <TooltipTrigger asChild>
              <Badge
                onClick={handleClick}
                variant="outline"
                className={cn(
                  'capitalize font-medium transition-colors',
                  isDeployed ? envInfo.deployedColor : envInfo.pendingColor,
                  size === 'sm' && 'px-1.5 py-0 text-[10px] h-4',
                  interactive && 'cursor-pointer hover:bg-muted/50',
                  justUpdatedEnv === env && 'animate-status-in'
                )}
              >
                {env}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="capitalize">
                {envInfo.label}: {tooltipText}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
