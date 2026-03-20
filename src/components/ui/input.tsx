
'use client';

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Loader2 } from "lucide-react"
import { refineText } from "@/ai/flows/refine-text-flow"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./tooltip"

export interface InputProps extends React.ComponentProps<"input"> {
    showRefine?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showRefine = false, ...props }, ref) => {
    const [isRefining, setIsRefining] = React.useState(false);
    const localRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleCombinedRef = (el: HTMLInputElement) => {
        localRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
    };

    const handleRefine = async () => {
        const el = localRef.current;
        if (!el || !el.value.trim() || isRefining) return;

        setIsRefining(true);
        try {
            const result = await refineText({ text: el.value });
            if (result.refinedText) {
                // Manually update value and trigger event for react-hook-form
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                )?.set;
                nativeInputValueSetter?.call(el, result.refinedText);
                el.dispatchEvent(new Event("input", { bubbles: true }));
                toast({ variant: 'success', title: 'Content Refined' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'AI Assist Unavailable' });
        } finally {
            setIsRefining(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showRefine && e.altKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            handleRefine();
        }
        props.onKeyDown?.(e);
    };

    return (
      <div className="relative group/input w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            showRefine && "pr-10",
            isRefining && "animate-pulse text-muted-foreground",
            className
          )}
          ref={handleCombinedRef}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {showRefine && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={handleRefine}
                                disabled={isRefining || !props.value}
                                className={cn(
                                    "h-8 w-8 rounded-md flex items-center justify-center transition-all",
                                    "hover:bg-primary/10 hover:text-primary",
                                    "disabled:opacity-20 disabled:cursor-not-allowed",
                                    isRefining ? "text-primary" : "text-muted-foreground opacity-0 group-focus-within/input:opacity-100 group-hover/input:opacity-100"
                                )}
                            >
                                {isRefining ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] font-bold">
                            <div className="flex items-center gap-2">
                                <span>Refine Content</span>
                                <kbd className="bg-muted px-1 rounded border">Alt + H</kbd>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
