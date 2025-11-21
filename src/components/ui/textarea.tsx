
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['b', 'i', 's', 'e'].includes(key)) {
          e.preventDefault();
          const target = e.currentTarget;
          const { selectionStart, selectionEnd, value } = target;

          let chars = '';
          switch (key) {
            case 'b': chars = '**'; break;
            case 'i': chars = '_'; break;
            case 's': chars = '~'; break;
            case 'e': chars = '`'; break;
          }

          const selectedText = value.substring(selectionStart, selectionEnd);
          const newText = `${value.substring(0, selectionStart)}${chars}${selectedText}${chars}${value.substring(selectionEnd)}`;

          // This is a bit of a trick to trigger the React state update if it's a controlled component
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(target, newText);

          const event = new Event('input', { bubbles: true });
          target.dispatchEvent(event);

          // Restore cursor position
          target.selectionStart = selectionStart + chars.length;
          target.selectionEnd = selectionEnd + chars.length;
        }
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
