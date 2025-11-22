
import * as React from "react"

import { cn } from "@/lib/utils"
import { applyFormat } from "./textarea-toolbar";

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
    
    // Auto-resize logic
    React.useEffect(() => {
        const textarea = localRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to recalculate
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [props.value]);


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        textarea.addEventListener('input', handleInput);
        // Initial adjustment
        handleInput();
      }

      return () => {
        if (textarea) {
          textarea.removeEventListener('input', handleInput);
        }
      };
    }, []);
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden resize-none",
          className
        )}
        ref={combinedRef}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
