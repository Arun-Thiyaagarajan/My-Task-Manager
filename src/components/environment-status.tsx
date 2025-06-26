
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface EnvironmentStatusProps {
  deploymentStatus: Task['deploymentStatus'];
  deploymentDates?: Task['deploymentDates'];
  size?: 'sm' | 'default';
}

export function EnvironmentStatus({ deploymentStatus, deploymentDates, size = 'default' }: EnvironmentStatusProps) {

  const getEnvInfo = (env: string) => {
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
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/80',
          label: env
        };
    }
  }

  const standardEnvs = ['dev', 'stage', 'production'];
  const customEnvs = Object.keys(deploymentStatus || {})
    .filter(env => !standardEnvs.includes(env) && deploymentStatus?.[env]);
  
  const envsToDisplay = [...standardEnvs, ...customEnvs];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-wrap items-center gap-1.5">
        {envsToDisplay.map(env => {
          const envInfo = getEnvInfo(env);
          const isSelected = deploymentStatus?.[env] ?? false;
          const hasDate = deploymentDates && deploymentDates[env];
          const isDeployed = isSelected && (env === 'dev' || !!hasDate);
          
          return (
            <Tooltip key={env}>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize font-medium',
                    isDeployed
                      ? envInfo.color
                      : 'border-dashed text-muted-foreground/80 dark:text-muted-foreground/50',
                    size === 'sm' && 'px-1.5 py-0 text-[10px] h-4'
                  )}
                >
                  {env}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">{envInfo.label}: {isDeployed ? 'Deployed' : (isSelected ? 'Pending' : 'Not in pipeline')}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
