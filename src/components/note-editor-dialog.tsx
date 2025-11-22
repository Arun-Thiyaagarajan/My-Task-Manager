
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Note } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat, FormatType } from '@/components/ui/textarea-toolbar';

interface NoteEditorDialogProps {
  note: Partial<Note> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string | undefined, title: string, content: string) => void;
}

export function NoteEditorDialog({
  note,
  isOpen,
  onOpenChange,
  onSave,
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(note?.title || '');
      setContent(note?.content || '');
      setTimeout(() => {
        descriptionEditorRef.current?.focus();
      }, 100);
    }
  }, [isOpen, note]);

  const handleSave = () => {
    onSave(note?.id, title, content);
    onOpenChange(false);
  };
  
  const handleFormat = (type: FormatType) => {
    if (descriptionEditorRef.current) {
      applyFormat(type, descriptionEditorRef.current);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{note?.id ? 'Edit Note' : 'New Note'}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="py-4 space-y-4">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
            />
            <div className="relative">
              <Textarea
                ref={descriptionEditorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Take a note..."
                className="min-h-[200px] max-h-[calc(80vh-200px)] w-full text-base pb-12"
                enableHotkeys
                onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSave();
                    }
                }}
              />
              <TextareaToolbar onFormatClick={handleFormat} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
