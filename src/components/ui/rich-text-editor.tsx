
'use client';

import React, { useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Toolbar } from './toolbar';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, className, placeholder }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);

    const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

    const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
      const target = event.currentTarget as HTMLDivElement;
      onChange(target.innerHTML);
    }, [onChange]);

    const updateActiveFormats = useCallback(() => {
        const formats: Record<string, boolean> = {};
        const commands: string[] = ['bold', 'italic', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'createLink'];
        
        commands.forEach(cmd => {
            try {
                formats[cmd] = document.queryCommandState(cmd);
            } catch (e) {
                formats[cmd] = false;
            }
        });

        // Check for code block ('pre')
        let selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            let node = selection.getRangeAt(0).startContainer;
            let inPre = false;
            while (node && node !== editorRef.current) {
                if (node.nodeName === 'PRE') {
                    inPre = true;
                    break;
                }
                node = node.parentNode!;
            }
            formats['formatBlock'] = inPre;
        }

        setActiveFormats(formats);
    }, []);

    const handleFocus = () => {
      if (editorRef.current && editorRef.current.innerHTML === placeholder) {
        editorRef.current.innerHTML = '';
        editorRef.current.classList.remove('text-muted-foreground');
      }
      updateActiveFormats();
    };

    const handleBlur = () => {
      if (editorRef.current && editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = placeholder || '';
        editorRef.current.classList.add('text-muted-foreground');
      }
    };
    
    useEffect(() => {
        const handleSelectionChange = () => {
            if (document.activeElement === editorRef.current) {
                updateActiveFormats();
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [updateActiveFormats]);

    useEffect(() => {
      if (editorRef.current) {
        if (value) {
            if(editorRef.current.innerHTML !== value) {
               editorRef.current.innerHTML = value;
            }
          editorRef.current.classList.remove('text-muted-foreground');
        } else {
          editorRef.current.innerHTML = placeholder || '';
          editorRef.current.classList.add('text-muted-foreground');
        }
      }
    }, [value, placeholder]);

    return (
      <div className="relative rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={updateActiveFormats}
          onKeyUp={updateActiveFormats}
          className={cn(
            'min-h-[120px] w-full p-3 pb-12 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className,
            '[&_pre]:(bg-muted p-2 rounded-md my-2 block overflow-x-auto font-mono text-sm)',
            '[&_ul]:(list-disc pl-5)',
            '[&_ol]:(list-decimal pl-5)',
            '[&_a]:(text-primary underline)'
          )}
        />
        <Toolbar editorRef={editorRef} activeFormats={activeFormats} />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };
