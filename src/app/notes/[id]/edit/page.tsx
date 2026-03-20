'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getNotes, updateNote } from '@/lib/data';
import type { Note } from '@/lib/types';
import { NoteForm } from '@/components/note-form';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Mobile-specific page for editing an existing note.
 */
export default function EditNotePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    const allNotes = getNotes();
    const found = allNotes.find(n => n.id === id);
    if (found) {
      setNote(found);
    }
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, [params.id]);

  const handleSave = (title: string, content: string) => {
    if (!note) return;
    
    if (!content.trim() && !title.trim()) {
      toast({ variant: 'destructive', title: 'Cannot save empty note.' });
      return;
    }
    
    updateNote(note.id, { title, content });
    toast({ variant: 'success', title: 'Note Updated' });
    
    window.dispatchEvent(new Event('navigation-start'));
    router.back();
  };

  const handleCancel = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.back();
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (!note) {
    return (
        <div className="container max-w-2xl mx-auto py-20 px-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Note not found</h1>
            <p className="text-muted-foreground">The note you are trying to edit does not exist.</p>
            <button onClick={handleCancel} className="text-primary font-bold hover:underline">Return to list</button>
        </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
        <div className="container max-w-2xl mx-auto py-8 px-6">
            <NoteForm 
                initialTitle={note.title}
                initialContent={note.content}
                onSave={handleSave} 
                onCancel={handleCancel} 
                isPage 
                submitLabel="Update Note"
            />
        </div>
    </div>
  );
}
