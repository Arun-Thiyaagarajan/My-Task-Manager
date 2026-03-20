"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { applyFormat, FormatType } from "./textarea-toolbar";
import { Popover, PopoverContent, PopoverAnchor } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { getDevelopers, getTesters } from "@/lib/data";
import type { Person } from "@/lib/types";
import { Code2, User, Sparkles, Loader2 } from "lucide-react";
import { refineText } from "@/ai/flows/refine-text-flow";
import { useToast } from "@/hooks/use-toast";


export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    enableHotkeys?: boolean;
    showRefine?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, enableHotkeys = false, showRefine = false, ...props }, ref) => {
    
    const localRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (el: HTMLTextAreaElement) => {
        localRef.current = el;
        if (typeof ref === 'function') {
            ref(el);
        } else if (ref) {
            ref.current = el;
        }
    };

    const [isMentionOpen, setIsMentionOpen] = React.useState(false);
    const [isRefining, setIsRefining] = React.useState(false);
    const [mentionQuery, setMentionQuery] = React.useState('');
    const [developers, setDevelopers] = React.useState<Person[]>([]);
    const [testers, setTesters] = React.useState<Person[]>([]);
    const [activeSuggestion, setActiveSuggestion] = React.useState(0);
    const mentionStartIndex = React.useRef<number | null>(null);
    const { toast } = useToast();

    const openMentionPopover = React.useCallback(() => {
        if (localRef.current) {
            mentionStartIndex.current = localRef.current.selectionStart;
            setIsMentionOpen(true);
            setDevelopers(getDevelopers());
            setTesters(getTesters());
            setActiveSuggestion(0);
        }
    }, []);

    const closeMentionPopover = React.useCallback(() => {
        setIsMentionOpen(false);
        setMentionQuery('');
        mentionStartIndex.current = null;
    }, []);
    
    React.useEffect(() => {
      const adjustHeight = () => {
        const textarea = localRef.current;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };

      adjustHeight();
    }, [props.value]);
    
    const handleRefine = React.useCallback(async () => {
        const el = localRef.current;
        if (!el || !el.value.trim() || isRefining) return;

        setIsRefining(true);
        try {
            const result = await refineText({ text: el.value });
            if (result.refinedText) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype,
                    "value"
                )?.set;
                nativeInputValueSetter?.call(el, result.refinedText);
                el.dispatchEvent(new Event("input", { bubbles: true }));
                toast({ variant: 'success', title: 'Content Refined' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'AI Assist Unavailable', description: error.message });
        } finally {
            setIsRefining(false);
        }
    }, [isRefining, toast]);

    React.useEffect(() => {
        const textarea = localRef.current;
        if (!textarea || !enableHotkeys) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                let handled = false;
                switch(e.key.toLowerCase()) {
                    case 'b': applyFormat('bold', textarea); handled = true; break;
                    case 'i': applyFormat('italic', textarea); handled = true; break;
                    case 'e': applyFormat('code', textarea); handled = true; break;
                    case 'x': if (e.shiftKey) { applyFormat('strike', textarea); handled = true; } break;
                    case 'c': if (e.shiftKey) { applyFormat('code-block', textarea); handled = true; } break;
                }
                if(handled) {
                    e.preventDefault();
                }
            }
            if (showRefine && e.altKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                handleRefine();
            }
        };

        textarea.addEventListener('keydown', handleKeyDown);
        return () => textarea.removeEventListener('keydown', handleKeyDown);
    }, [enableHotkeys, showRefine, handleRefine]);


    const handleMentionSelect = (name: string) => {
        if(localRef.current && mentionStartIndex.current !== null) {
            const { value } = localRef.current;
            const start = mentionStartIndex.current - 2; // include the @<
            const end = localRef.current.selectionStart;

            const mentionText = `@<${name}> `;
            const newValue = value.substring(0, start) + mentionText + value.substring(end);
            
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
            nativeInputValueSetter?.call(localRef.current, newValue);
            
            const event = new Event('input', { bubbles: true });
            localRef.current.dispatchEvent(event);

            const newCursorPos = start + mentionText.length;
            localRef.current.focus();
            setTimeout(() => {
                localRef.current!.selectionStart = newCursorPos;
                localRef.current!.selectionEnd = newCursorPos;
            }, 0);
        }
        closeMentionPopover();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const filteredPeople = [...filteredDevelopers, ...filteredTesters];
        if (isMentionOpen) {
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === 'ArrowUp') {
                    setActiveSuggestion(prev => Math.max(0, prev - 1));
                } else if (e.key === 'ArrowDown') {
                    setActiveSuggestion(prev => Math.min(filteredPeople.length - 1, prev + 1));
                } else if ((e.key === 'Enter' || e.key === 'Tab') && filteredPeople[activeSuggestion]) {
                    handleMentionSelect(filteredPeople[activeSuggestion].name);
                }
            }
        }
        if (props.onKeyDown) {
            props.onKeyDown(e);
        }
    };
    
    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.currentTarget;
        const trigger = value.substring(selectionStart - 2, selectionStart);

        if (trigger === '@<') {
            openMentionPopover();
        } else if (isMentionOpen && mentionStartIndex.current !== null) {
            const queryText = value.substring(mentionStartIndex.current, selectionStart);
            if (!queryText.trim() || queryText.includes('>')) {
                closeMentionPopover();
            } else {
                setMentionQuery(queryText.toLowerCase());
                setActiveSuggestion(0);
            }
        }

        if(props.onChange) {
            props.onChange(e);
        }
    };

    const filteredDevelopers = developers.filter(d => d.name.toLowerCase().includes(mentionQuery));
    const filteredTesters = testers.filter(t => t.name.toLowerCase().includes(mentionQuery));
    const suggestionList = [...filteredDevelopers, ...filteredTesters];
    
    return (
        <Popover open={isMentionOpen} onOpenChange={setIsMentionOpen}>
            <PopoverAnchor asChild>
                <div className="relative w-full">
                    <textarea
                        className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto resize-none",
                        isRefining && "animate-pulse text-muted-foreground",
                        className
                        )}
                        ref={combinedRef}
                        onKeyDown={handleKeyDown}
                        onChange={handleTextareaInput}
                        {...props}
                    />
                    {isRefining && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-md z-20 pointer-events-none">
                            <div className="flex items-center gap-2 px-4 py-2 bg-background border shadow-2xl rounded-full animate-in zoom-in-95 duration-300 pointer-events-auto">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-xs font-bold uppercase tracking-widest text-primary/90">AI Refining</span>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverAnchor>
            <PopoverContent 
                className="w-64 p-0" 
                onOpenAutoFocus={(e) => e.preventDefault()} 
                align="start"
                onEscapeKeyDown={closeMentionPopover}
                onInteractOutside={closeMentionPopover}
            >
                <Command>
                    <CommandList>
                        <CommandEmpty>No one found.</CommandEmpty>
                        {filteredDevelopers.length > 0 && (
                            <CommandGroup heading="Developers">
                                {filteredDevelopers.map((dev, index) => (
                                    <CommandItem
                                        key={dev.id}
                                        onSelect={() => handleMentionSelect(dev.name)}
                                        value={dev.name}
                                        className={cn('flex items-center gap-2', activeSuggestion === index && 'bg-accent')}
                                    >
                                        <Code2 className="h-4 w-4 text-muted-foreground" />
                                        {dev.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        {filteredTesters.length > 0 && (
                             <CommandGroup heading="Testers">
                                {filteredTesters.map((tester, index) => (
                                    <CommandItem
                                        key={tester.id}
                                        onSelect={() => handleMentionSelect(tester.name)}
                                        value={tester.name}
                                        className={cn('flex items-center gap-2', activeSuggestion === filteredDevelopers.length + index && 'bg-accent')}
                                    >
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        {tester.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
