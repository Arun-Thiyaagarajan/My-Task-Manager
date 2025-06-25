'use client';

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
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { deleteTask } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

interface DeleteTaskButtonProps {
  taskId: string;
  onSuccess: () => void;
  iconOnly?: boolean;
}

export function DeleteTaskButton({ taskId, onSuccess, iconOnly = false }: DeleteTaskButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    setIsPending(true);
    try {
      deleteTask(taskId);
      toast({
        variant: 'success',
        title: 'Task Deleted',
        description: 'The task has been successfully removed.',
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
       console.error(error);
       toast({
         variant: 'destructive',
         title: 'Something went wrong',
         description: error instanceof Error ? error.message : 'Please try again.',
       });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
            <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Task</span>
            </Button>
        ) : (
            <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the task.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
