
import * as React from 'react';
import { cn } from '@/lib/utils';
import { TextareaToolbar, applyFormat } from './textarea-toolbar';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, onKeyDown, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['b', 'i', 's', 'e'].includes(key)) {
          e.preventDefault();
          const target = e.currentTarget;
          
          let formatType: 'bold' | 'italic' | 'strike' | 'code' | null = null;
          switch (key) {
            case 'b': formatType = 'bold'; break;
            case 'i': formatType = 'italic'; break;
            case 's': formatType = 'strike'; break;
            case 'e': formatType = 'code'; break;
          }

          if (formatType) {
            applyFormat(formatType, target);
          }
        }
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    };
    
    const handleToolbarClick = (formatType: 'bold' | 'italic' | 'strike' | 'code') => {
        if (internalRef.current) {
            applyFormat(formatType, internalRef.current);
        }
    };

    return (
      <div className="relative">
        <textarea
            className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
            )}
            ref={internalRef}
            onKeyDown={handleKeyDown}
            {...props}
        />
        <TextareaToolbar onFormatClick={handleToolbarClick} />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
