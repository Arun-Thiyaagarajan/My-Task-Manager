
import * as React from "react"
import type { TaskStatus, UiConfig } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusStyles, getStatusDisplayName, StatusIcon, isStatusValue } from '@/lib/status-config';

interface TaskStatusBadgeProps extends Omit<React.ComponentPropsWithoutRef<typeof Badge>, 'variant'> {
  status: TaskStatus;
  variant?: 'default' | 'prominent';
  uiConfig?: UiConfig | null;
}

type StatusConfig = {
  label: string;
  isCustom: boolean;
  className?: string;
  prominentClassName?: string;
  cardClassName?: string;
  style?: React.CSSProperties;
  prominentStyle?: React.CSSProperties;
  cardStyle?: React.CSSProperties;
  defaultIconStyle?: React.CSSProperties;
  prominentIconStyle?: React.CSSProperties;
  backgroundIconStyle?: React.CSSProperties;
  shouldSpin?: boolean;
};

export function getStatusConfig(status: TaskStatus, uiConfig?: UiConfig | null): StatusConfig {
  const styles = getStatusStyles(status, uiConfig);

  return {
    label: getStatusDisplayName(status, uiConfig),
    isCustom: true,
    className: 'hover:opacity-90',
    prominentClassName: 'hover:opacity-90',
    cardClassName: 'hover:border-opacity-80',
    style: styles.defaultStyle,
    prominentStyle: styles.prominentStyle,
    cardStyle: styles.cardStyle,
    defaultIconStyle: styles.defaultIconStyle,
    prominentIconStyle: styles.prominentIconStyle,
    backgroundIconStyle: styles.backgroundIconStyle,
    shouldSpin: isStatusValue(status, 'in_progress', uiConfig),
  };
}

export const TaskStatusBadge = React.forwardRef<
  React.ElementRef<typeof Badge>,
  TaskStatusBadgeProps
>(({ status, className, variant = 'default', uiConfig, ...props }, ref) => {
  if (!status) return null;

  const config = getStatusConfig(status, uiConfig);
  const configClassName = variant === 'prominent' ? config.prominentClassName : config.className;
  const configStyle = variant === 'prominent' ? config.prominentStyle : config.style;
  const iconStyle = variant === 'prominent' ? config.prominentIconStyle : config.defaultIconStyle;
  
  return (
    <Badge
      ref={ref}
      variant="outline"
      className={cn('gap-1.5 font-medium capitalize', configClassName, className)}
      style={configStyle}
      {...props}
    >
      <StatusIcon status={status} uiConfig={uiConfig} style={iconStyle} className={cn("h-3 w-3 shrink-0", config.shouldSpin && 'animate-spin')} />
      <span>{config.label}</span>
    </Badge>
  );
});
TaskStatusBadge.displayName = 'TaskStatusBadge';
