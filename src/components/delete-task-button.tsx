
'use client';

import { Button } from '@/components/ui/button';
import { Trash2, History } from 'lucide-react';
import { moveTaskToBin, restoreTask } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
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

interface DeleteTaskButtonProps {
  taskId: string;
  taskTitle: string;
  onSuccess: () => void;
  iconOnly?: boolean;
  className?: string;
}

export function DeleteTaskButton({ taskId, taskTitle, onSuccess, iconOnly = false, className }: DeleteTaskButtonProps) {
  const { toast } = useToast();

  const handleMoveToBin = () => {
    moveTaskToBin(taskId);
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
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={iconOnly ? "ghost" : "destructive"}
          size={iconOnly ? "icon" : "sm"}
          onClick={handleClick}
          className={cn(
            iconOnly && "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive",
            className
          )}
        >
          {iconOnly ? (
              <>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete Task</span>
              </>
          ) : (
              <>
                  <Trash2 className="mr-2 h-4 w-4" />
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
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleMoveToBin} className="bg-destructive hover:bg-destructive/90">
            Move to Bin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
