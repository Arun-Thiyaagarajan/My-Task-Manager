'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getNotes, deleteNote, getUiConfig } from '@/lib/data';
import type { Note, UiConfig } from '@/lib/types';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Button } from '@/components/ui/button';
import { 
    ArrowLeft, 
    Pencil, 
    Trash2, 
    Copy, 
    Check, 
    Clock, 
    StickyNote,
    Share2,
    MoreVertical
} from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ViewNotePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    const allNotes = getNotes();
    const found = allNotes.find(n => n.id === id);
    if (found) {
      setNote(found);
    }
    setUiConfig(getUiConfig());
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, [params.id]);

  const handleBack = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push('/notes');
  };

  const handleEdit = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push(`/notes/${note?.id}/edit`);
  };

  const handleCopy = () => {
    if (!note) return;
    const textToCopy = `${note.title ? `${note.title}\n\n` : ''}${note.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        toast({ variant: 'success', title: 'Note copied' });
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!note) return;
    try {
        if (navigator.share) {
            await navigator.share({
                title: note.title || 'Note',
                text: note.content
            });
        } else {
            handleCopy();
        }
    } catch (e) {
        // Silently catch aborts
    }
  };

  const handleDelete = () => {
    if (!note) return;
    deleteNote(note.id);
    toast({ variant: 'success', title: 'Note deleted', description: 'Moved to bin.' });
    window.dispatchEvent(new Event('navigation-start'));
    router.push('/notes');
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (!note || !uiConfig) {
    return (
        <div className="container max-w-2xl mx-auto py-20 px-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Note not found</h1>
            <p className="text-muted-foreground">The note you are looking for does not exist.</p>
            <Button onClick={handleBack} variant="outline" className="rounded-xl">Return to list</Button>
        </div>
    );
  }

  return (
    <div id="note-detail-page" className="bg-background min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-4 h-14 flex items-center justify-between border-b bg-background/95 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-full shrink-0 border border-white/10 bg-white/[0.03]">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="min-w-0">
                    <h1 className="text-sm font-bold truncate pr-4">{note.title || 'Untitled Note'}</h1>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(note.updatedAt, uiConfig.timeFormat)}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className={cn(
                        "h-10 w-10 rounded-full border border-white/10 bg-white/[0.03]",
                        isCopied ? "text-green-400 hover:bg-green-500/10" : "text-foreground/80 hover:bg-white/[0.07] hover:text-foreground"
                    )}
                >
                    {isCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleEdit} className="h-10 w-10 rounded-full border border-primary/12 bg-primary/8 text-primary hover:bg-primary/12">
                    <Pencil className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03]">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={handleCopy}>
                            <Copy className="h-4 w-4 mr-2" /> Copy text
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShare}>
                            <Share2 className="h-4 w-4 mr-2" /> Share...
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/5"
                            onSelect={(e) => e.preventDefault()}
                        >
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <div className="flex items-center w-full">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete note
                                    </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl w-[90%] mx-auto">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-bold">Delete Note?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm">
                                            This will move the note to your bin.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col gap-2 mt-4">
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">Delete Note</AlertDialogAction>
                                        <AlertDialogCancel className="rounded-xl h-11 font-medium border-none bg-muted/50">Cancel</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Content Area */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-8 pb-40">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.78)]">
                {note.title && (
                    <div className="mb-8 space-y-2 animate-in fade-in slide-in-from-left-4 duration-500">
                        <Badge variant="secondary" className="bg-primary/8 text-primary border-none text-[10px] font-bold tracking-widest uppercase px-2.5 h-6 rounded-full">NOTE</Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">{note.title}</h2>
                    </div>
                )}
                <div className="text-lg leading-relaxed text-foreground/90 selection:bg-primary/20 animate-in fade-in duration-700">
                    <RichTextViewer text={note.content} />
                </div>
            </div>
        </div>

        {/* Floating Tool - Bottom */}
        <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-20 hidden px-6 sm:block">
            <div className="flex justify-center pointer-events-auto">
                <Button 
                    id="note-detail-copy"
                    variant="secondary" 
                    size="lg"
                    className={cn(
                        "h-14 rounded-full px-8 font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_24px_55px_-24px_rgba(0,0,0,0.8)] transition-all active:scale-95 border border-primary/10",
                        isCopied ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
                    )}
                    onClick={handleCopy}
                >
                    {isCopied ? (
                        <>
                            <Check className="h-5 w-5 mr-2" />
                            COPIED!
                        </>
                    ) : (
                        <>
                            <Copy className="h-5 w-5 mr-2" />
                            COPY NOTE
                        </>
                    )}
                </Button>
            </div>
        </div>
    </div>
  );
}
