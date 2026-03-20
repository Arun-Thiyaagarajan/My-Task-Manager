'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addNote } from '@/lib/data';
import { NoteForm } from '@/components/note-form';
import { useEffect } from 'react';

/**
 * Mobile-specific page for creating a new note.
 */
export default function NewNotePage() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const handleSave = (title: string, content: string) => {
    if (!content.trim() && !title.trim()) {
      toast({ variant: 'destructive', title: 'Cannot save empty note.' });
      return;
    }
    
    addNote({ title, content });
    toast({ variant: 'success', title: 'Note Saved' });
    
    window.dispatchEvent(new Event('navigation-start'));
    router.back();
  };

  const handleCancel = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.back();
  };

  return (
    <div className="bg-background min-h-screen">
        <div className="container max-w-2xl mx-auto py-8 px-6">
            <NoteForm 
                onSave={handleSave} 
                onCancel={handleCancel} 
                isPage 
                submitLabel="Create Note"
            />
        </div>
    </div>
  );
}
