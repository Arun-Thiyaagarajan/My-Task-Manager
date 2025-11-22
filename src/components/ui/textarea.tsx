
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { applyFormat, FormatType } from "./textarea-toolbar";
import { Popover, PopoverContent, PopoverAnchor } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { getDevelopers, getTesters } from "@/lib/data";
import type { Person } from "@/lib/types";
import { Code2, User } from "lucide-react";


export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    enableHotkeys?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, enableHotkeys = false, ...props }, ref) => {
    
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
    const [mentionQuery, setMentionQuery] = React.useState('');
    const [developers, setDevelopers] = React.useState<Person[]>([]);
    const [testers, setTesters] = React.useState<Person[]>([]);
    const [activeSuggestion, setActiveSuggestion] = React.useState(0);
    const mentionStartIndex = React.useRef<number | null>(null);

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
    
    // This effect handles the dynamic sizing of the textarea
    React.useEffect(() => {
      const textarea = localRef.current;
      const handleInput = () => {
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };

      if (textarea) {
        setTimeout(handleInput, 0); // Initial adjustment
        textarea.addEventListener('input', handleInput);
      }
      return () => {
        if (textarea) {
          textarea.removeEventListener('input', handleInput);
        }
      };
    }, [props.value]);
    
    // This effect handles the hotkeys for formatting
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
        };

        textarea.addEventListener('keydown', handleKeyDown);
        return () => textarea.removeEventListener('keydown', handleKeyDown);
    }, [enableHotkeys]);


    const handleMentionSelect = (name: string) => {
        if(localRef.current && mentionStartIndex.current !== null) {
            const { value } = localRef.current;
            const start = mentionStartIndex.current - 1; // include the @
            const end = localRef.current.selectionStart;

            const mentionText = `**@${name}** `;
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
        const lastChar = value[selectionStart - 1];

        if (lastChar === '@') {
            openMentionPopover();
        } else if (isMentionOpen && mentionStartIndex.current !== null) {
            const queryText = value.substring(mentionStartIndex.current, selectionStart);
            if (!queryText || /\s/.test(queryText)) {
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
                <textarea
                    className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto resize-none",
                    className
                    )}
                    ref={combinedRef}
                    onKeyDown={handleKeyDown}
                    onChange={handleTextareaInput}
                    {...props}
                />
            </PopoverAnchor>
            <PopoverContent 
                className="w-64 p-0" 
                onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
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
