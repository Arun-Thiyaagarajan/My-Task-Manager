
import * as React from "react"

import { cn } from "@/lib/utils"
import { applyFormat } from "./textarea-toolbar";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    enableHotkeys?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, enableHotkeys = false, ...props }, ref) => {
    
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
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
