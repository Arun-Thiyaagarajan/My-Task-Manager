'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addNote } from '@/lib/data';
import { NoteForm } from '@/components/note-form';
import { useEffect, useState } from 'react';

/**
 * Mobile-specific page for creating a new note.
 */
export default function NewNotePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const handleSave = (title: string, content: string) => {
    if (!content.trim() && !title.trim()) {
      toast({ variant: 'destructive', title: 'Cannot save empty note.' });
      return;
    }
    setIsPending(true);
    requestAnimationFrame(() => {
      try {
        addNote({ title, content });
        toast({ variant: 'success', title: 'Note Saved' });
        window.dispatchEvent(new Event('navigation-start'));
        router.back();
      } finally {
        setIsPending(false);
      }
    });
  };

  const handleCancel = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.back();
  };

  return (
    <div className="bg-background h-[100dvh] overflow-hidden">
        <div className="container mx-auto flex h-full max-w-2xl flex-col overflow-hidden px-6 py-6 sm:py-8">
            <NoteForm 
                onSave={handleSave} 
                onCancel={handleCancel} 
                isPending={isPending}
                isPage 
                submitLabel="Create Note"
            />
        </div>
    </div>
  );
}
