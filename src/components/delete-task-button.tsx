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
import { useTransition } from 'react';
import { deleteTaskAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface DeleteTaskButtonProps {
  taskId: string;
}

export function DeleteTaskButton({ taskId }: DeleteTaskButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    const formData = new FormData();
    formData.append('id', taskId);

    startTransition(async () => {
      try {
        await deleteTaskAction(formData);
        toast({
          title: 'Task Deleted',
          description: 'The task has been successfully removed.',
        });
      } catch (error) {
         console.error(error);
         toast({
           variant: 'destructive',
           title: 'Something went wrong',
           description: error instanceof Error ? error.message : 'Please try again.',
         });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
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
