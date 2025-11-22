

'use client';

import { Badge } from '@/components/ui/badge';
import type { Task, Environment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EnvironmentStatusProps {
  deploymentStatus: Task['deploymentStatus'];
  deploymentDates?: Task['deploymentDates'];
  configuredEnvs: Environment[];
  size?: 'sm' | 'default';
  interactive?: boolean;
  onToggle?: (env: string) => void;
  justUpdatedEnv?: string | null;
  onAnimationEnd?: () => void;
}

export function EnvironmentStatus({
  deploymentStatus,
  deploymentDates,
  configuredEnvs,
  size = 'default',
  interactive = false,
  onToggle,
  justUpdatedEnv,
  onAnimationEnd,
}: EnvironmentStatusProps) {
  
  const MAX_VISIBLE_ENVS = 4;
  const visibleEnvs = configuredEnvs.slice(0, MAX_VISIBLE_ENVS);
  const hiddenEnvsCount = configuredEnvs.length - MAX_VISIBLE_ENVS;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onAnimationEnd={onAnimationEnd}
    >
      {visibleEnvs.map(env => {
        const isSelected = deploymentStatus?.[env.name] ?? false;
        const hasDate = deploymentDates && deploymentDates[env.name];
        const isDeployed = isSelected && (env.name === 'dev' || !!hasDate);

        const tooltipText = isDeployed ? 'Deployed' : 'Pending';

        const handleClick = (e: React.MouseEvent) => {
          if (interactive && onToggle) {
            e.stopPropagation();
            e.preventDefault();
            onToggle(env.name);
          }
        };

        return (
          <Tooltip key={env.name}>
            <TooltipTrigger asChild>
              <Badge
                onClick={handleClick}
                style={{
                    backgroundColor: isDeployed ? env.color : `${env.color}20`,
                    color: isDeployed ? '#fff' : env.color,
                    borderColor: env.color,
                }}
                className={cn(
                  'capitalize font-medium transition-all border',
                  !isDeployed && 'border-dashed',
                  size === 'sm' && 'px-1.5 py-0 text-[10px] h-4',
                  interactive && 'cursor-pointer',
                  interactive && isDeployed && 'hover:brightness-110 hover:scale-105',
                  interactive && !isDeployed && 'hover:bg-gray-500/10',
                  justUpdatedEnv === env.name && 'animate-status-in'
                )}
              >
                {env.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="capitalize">
                {env.name}: {tooltipText}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
       {hiddenEnvsCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'font-medium',
                size === 'sm' && 'px-1.5 py-0 text-[10px] h-4'
              )}
            >
              +{hiddenEnvsCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Plus {hiddenEnvsCount} more environment(s)</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
