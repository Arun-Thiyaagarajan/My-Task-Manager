
'use client';

import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';
import { Trash2, History } from 'lucide-react';
import { getTaskRelationshipReferences, moveTaskToBin, restoreTask, type TaskRelationshipReference } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppTooltip } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface DeleteTaskButtonProps {
  taskId: string;
  taskTitle: string;
  onSuccess: () => void;
  iconOnly?: boolean;
  className?: string;
  children?: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  iconClassName?: string;
}

export function DeleteTaskButton({
  taskId,
  taskTitle,
  onSuccess,
  iconOnly = false,
  className,
  children,
  variant,
  size,
  iconClassName,
}: DeleteTaskButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const relatedTasks = React.useMemo<TaskRelationshipReference[]>(
    () => (isOpen ? getTaskRelationshipReferences(taskId) : []),
    [isOpen, taskId]
  );

  const handleMoveToBin = () => {
    moveTaskToBin(taskId);
    setIsOpen(false);
    onSuccess();
    
    const { id, dismiss, update } = toast({
      variant: 'default',
      title: 'Task Moved to Bin',
      description: `Task "${taskTitle}" has been moved.`,
      duration: 10000,
    });

    update({
      id,
      action: (
        <ToastAction
          altText="Undo move"
          onClick={() => {
            restoreTask(taskId);
            onSuccess();
            dismiss();
            toast({ variant: 'success', title: 'Task restored!' });
          }}
        >
          <History className="mr-2 h-4 w-4" />
          Undo
        </ToastAction>
      ),
    });
  };
  
  if (children) {
     return (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="w-full">
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                    {children}
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will move the task "{taskTitle}" to the bin. You can restore it later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {relatedTasks.length > 0 ? (
                      <RelatedTasksPreview relatedTasks={relatedTasks} />
                    ) : null}
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleMoveToBin} className="bg-destructive hover:bg-destructive/90">Move to Bin</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
     )
  }

  return (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant ?? (iconOnly ? "ghost" : "destructive")}
            size={size ?? (iconOnly ? "icon" : "sm")}
            className={cn(
              iconOnly && "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive",
              className
            )}
          >
            {iconOnly ? (
                <>
                    <Trash2 className={cn("h-4 w-4", iconClassName)} />
                    <span className="sr-only">Delete Task</span>
                </>
            ) : (
                <>
                    <Trash2 className={cn("mr-2 h-4 w-4", iconClassName)} />
                    Delete
                </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the task "{taskTitle}" to the bin. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {relatedTasks.length > 0 ? (
            <RelatedTasksPreview relatedTasks={relatedTasks} />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToBin} className="bg-destructive hover:bg-destructive/90">
              Move to Bin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RelatedTasksPreview({ relatedTasks }: { relatedTasks: TaskRelationshipReference[] }) {
  return (
    <div className="rounded-xl border border-border/65 bg-muted/[0.08] p-3">
      <div className="mb-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">Related tasks</p>
        <p className="text-xs text-muted-foreground">
          These relationships will be removed safely when this task moves to the bin.
        </p>
      </div>
      <ScrollArea className="max-h-56 pr-3">
        <div className="space-y-2">
          {relatedTasks.map(({ task, relationLabels }) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/90 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <AppTooltip content={task.title} delayDuration={180} side="top" className="max-w-xs break-words text-sm">
                  <p className="truncate text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                </AppTooltip>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {relationLabels.map(label => (
                  <Badge key={label} variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
