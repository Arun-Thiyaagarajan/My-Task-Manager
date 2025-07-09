
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ShareMenu } from './share-menu';
import { BellRing, Share2 } from 'lucide-react';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Separator } from './ui/separator';

interface TaskCardContextMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  uiConfig: UiConfig;
  developers: Person[];
  testers: Person[];
  onSetReminder: () => void;
}

export function TaskCardContextMenu({ 
    isOpen, 
    onOpenChange, 
    task, 
    uiConfig,
    developers,
    testers,
    onSetReminder 
}: TaskCardContextMenuProps) {

  const handleReminderClick = () => {
    onSetReminder();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs p-2">
        <DialogHeader className="px-2 pt-1 pb-2">
          <DialogTitle className="text-base truncate">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {uiConfig.remindersEnabled && (
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleReminderClick}>
              <BellRing className="h-4 w-4" />
              {task.reminder ? 'Edit Reminder' : 'Set Reminder'}
            </Button>
          )}
          <ShareMenu task={task} uiConfig={uiConfig} developers={developers} testers={testers}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Share2 className="h-4 w-4" />
              Share...
            </Button>
          </ShareMenu>
        </div>
      </DialogContent>
    </Dialog>
  );
}
