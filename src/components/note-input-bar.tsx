'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Save } from 'lucide-react';
import { addNote } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function NoteInputBar() {
    const [content, setContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();
    const [commandKey, setCommandKey] = useState('Ctrl');

    useEffect(() => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        setCommandKey(isMac ? '⌘' : 'Ctrl');

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                textareaRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSave = () => {
        if (!content.trim()) {
            toast({
                variant: 'destructive',
                title: 'Cannot save an empty note.',
            });
            return;
        }

        addNote({ content });
        toast({
            variant: 'success',
            title: 'Note Saved',
        });
        setContent('');
        window.dispatchEvent(new Event('notes-updated'));
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex items-center gap-2 py-3">
                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Take a note... (Ctrl+/)"
                        className="pr-12 resize-none max-h-40"
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            }
                        }}
                    />
                    <Button
                        size="icon"
                        className={cn("absolute right-2 shrink-0 transition-opacity duration-300", content.trim() ? "opacity-100" : "opacity-0 pointer-events-none")}
                        onClick={handleSave}
                    >
                        <Save className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
