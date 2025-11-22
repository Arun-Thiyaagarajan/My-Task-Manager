
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

    const openMentionPopover = React.useCallback(() => {
        if (localRef.current) {
            setIsMentionOpen(true);
            setDevelopers(getDevelopers());
            setTesters(getTesters());
        }
    }, []);
    
    const handleFormatClick = (formatType: FormatType) => {
        if(formatType === 'mention') {
            if (localRef.current) {
                // Manually insert '@' to trigger the popover
                const { selectionStart, value } = localRef.current;
                const newValue = value.substring(0, selectionStart) + '@' + value.substring(selectionStart);
                
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(localRef.current, newValue);
                
                const event = new Event('input', { bubbles: true });
                localRef.current.dispatchEvent(event);

                localRef.current.selectionStart = selectionStart + 1;
                localRef.current.selectionEnd = selectionStart + 1;
                localRef.current.focus();

                openMentionPopover();
            }
        } else {
            if (localRef.current) {
                applyFormat(formatType, localRef.current);
            }
        }
    };
    
    React.useImperativeHandle(props.forwardedRef, () => ({
        ...localRef.current,
        handleFormatClick,
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isMentionOpen) {
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(e.key)) {
                e.preventDefault();
                const allPeople = [...developers.filter(d => d.name.toLowerCase().includes(mentionQuery)), ...testers.filter(t => t.name.toLowerCase().includes(mentionQuery))];
                if (e.key === 'ArrowUp') {
                    setActiveSuggestion(prev => Math.max(0, prev - 1));
                } else if (e.key === 'ArrowDown') {
                    setActiveSuggestion(prev => Math.min(allPeople.length - 1, prev + 1));
                } else if ((e.key === 'Enter' || e.key === 'Tab') && allPeople[activeSuggestion]) {
                    handleMentionSelect(allPeople[activeSuggestion].name);
                }
            }
        }

        if (enableHotkeys && (e.ctrlKey || e.metaKey)) {
            let handled = false;
            switch(e.key.toLowerCase()) {
                case 'b': applyFormat('bold', e.currentTarget); handled = true; break;
                case 'i': applyFormat('italic', e.currentTarget); handled = true; break;
                case 'e': applyFormat('code', e.currentTarget); handled = true; break;
                case 'x': if (e.shiftKey) { applyFormat('strike', e.currentTarget); handled = true; } break;
                case 'c': if (e.shiftKey) { applyFormat('code-block', e.currentTarget); handled = true; } break;
            }
            if(handled) {
                e.preventDefault();
            }
        }
        if (props.onKeyDown) {
            props.onKeyDown(e);
        }
    }
    
    React.useEffect(() => {
      const textarea = localRef.current;
      const handleInput = () => {
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };

      if (textarea) {
        // Initial adjustment in a timeout to ensure DOM is ready
        setTimeout(handleInput, 0);
        textarea.addEventListener('input', handleInput);
      }

      return () => {
        if (textarea) {
          textarea.removeEventListener('input', handleInput);
        }
      };
    }, [props.value]);

    const handleMentionSelect = (name: string) => {
        if(localRef.current) {
            applyFormat('mention', localRef.current, name);
        }
        setIsMentionOpen(false);
        setMentionQuery('');
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.currentTarget;
        const lastChar = value[selectionStart - 1];

        if (lastChar === '@') {
            openMentionPopover();
        } else if (isMentionOpen) {
            const atIndex = value.lastIndexOf('@', selectionStart -1);
            if (atIndex === -1 || /\s/.test(value.substring(atIndex, selectionStart))) {
                setIsMentionOpen(false);
            } else {
                setMentionQuery(value.substring(atIndex + 1, selectionStart).toLowerCase());
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
