
'use client';

import React, { useCallback, useImperativeHandle, useRef } from 'react';
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

    const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
      const target = event.currentTarget as HTMLDivElement;
      onChange(target.innerHTML);
    }, [onChange]);

    const handleFocus = () => {
      if (editorRef.current && editorRef.current.innerHTML === placeholder) {
        editorRef.current.innerHTML = '';
        editorRef.current.classList.remove('text-muted-foreground');
      }
    };

    const handleBlur = () => {
      if (editorRef.current && editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = placeholder || '';
        editorRef.current.classList.add('text-muted-foreground');
      }
    };

    React.useEffect(() => {
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
          className={cn(
            'min-h-[120px] w-full p-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
          )}
        />
        <Toolbar editorRef={editorRef} />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };
