
'use client';

import { Button } from '@/components/ui/button';
import { Trash2, History } from 'lucide-react';
import { moveTaskToBin, restoreTask } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

interface DeleteTaskButtonProps {
  taskId: string;
  taskTitle: string;
  onSuccess: () => void;
  iconOnly?: boolean;
}

export function DeleteTaskButton({ taskId, taskTitle, onSuccess, iconOnly = false }: DeleteTaskButtonProps) {
  const { toast } = useToast();

  const handleMoveToBin = () => {
    moveTaskToBin(taskId);
    onSuccess();
    
    toast({
      variant: 'success',
      title: 'Task Moved to Bin',
      description: `Task "${taskTitle}" has been moved.`,
      duration: 10000,
      action: (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            restoreTask(taskId);
            onSuccess();
            toast({ variant: 'success', title: 'Task restored!' });
          }}
        >
          <History className="mr-2 h-4 w-4" />
          Undo
        </Button>
      ),
    });
  };

  return (
    <Button
        variant="destructive"
        size={iconOnly ? "icon" : "sm"}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMoveToBin();
        }}
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
  );
}
