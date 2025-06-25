import { Badge } from '@/components/ui/badge';
import { ENVIRONMENTS } from '@/lib/constants';
import type { Task, Environment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface EnvironmentStatusProps {
  deploymentStatus: Task['deploymentStatus'];
  size?: 'sm' | 'default';
}

export function EnvironmentStatus({ deploymentStatus, size = 'default' }: EnvironmentStatusProps) {
  const isDeployed = (env: Environment) => deploymentStatus && deploymentStatus[env];

  const getEnvInfo = (env: Environment) => {
    switch(env) {
      case 'dev':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80',
          label: 'Development' 
        };
      case 'stage':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80',
          label: 'Staging'
         };
      case 'production':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80',
          label: 'Production'
         };
      case 'others':
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/80',
          label: 'Others'
        };
      default:
        return {
          color: 'bg-muted text-muted-foreground',
          label: 'Unknown'
        }
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-wrap items-center gap-1.5">
        {ENVIRONMENTS.map(env => {
          const deployed = isDeployed(env);
          const envInfo = getEnvInfo(env);
          
          return (
            <Tooltip key={env}>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize font-medium',
                    deployed
                      ? envInfo.color
                      : 'border-dashed text-muted-foreground/80 dark:text-muted-foreground/50',
                    size === 'sm' && 'px-1.5 py-0 text-[10px] h-4'
                  )}
                >
                  {env}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{envInfo.label}: {deployed ? 'Deployed' : 'Pending'}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
