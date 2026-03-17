'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PeopleManagementContent } from './people-management-content';
import { Users, ClipboardCheck } from 'lucide-react';

interface PeopleManagerDialogProps {
  type: 'developer' | 'tester';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PeopleManagerDialog({ type, isOpen, onOpenChange, onSuccess }: PeopleManagerDialogProps) {
  const title = type === 'developer' ? 'Developer' : 'Tester';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Manage {title}s</DialogTitle>
          <DialogDescription>View and manage the list of {title.toLowerCase()}s in your workspace.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
            <PeopleManagementContent 
                type={type} 
                onSuccess={onSuccess} 
            />
        </div>
        <div className="p-4 border-t bg-muted/10 flex justify-end shrink-0">
            <DialogClose asChild>
                <Button variant="outline" className="px-8 font-medium">Close</Button>
            </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
