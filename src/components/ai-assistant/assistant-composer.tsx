'use client';

import { ChevronsRight, Loader2, MessageSquare, SendHorizonal, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  input: string;
  isBusy: boolean;
  isAvailabilityChecking: boolean;
  hasTrackedRequest: boolean;
  isExecuting: boolean;
  isStopConfirmOpen: boolean;
  hasLongWaitNotice: boolean;
  onInputChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  onSubmit: () => void;
  onOpenStopConfirm: (open: boolean) => void;
  onStopCurrentRequest: () => void;
  onManageSettings: () => void;
};

export function AssistantComposer(props: Props) {
  const {
    input,
    isBusy,
    isAvailabilityChecking,
    hasTrackedRequest,
    isExecuting,
    isStopConfirmOpen,
    hasLongWaitNotice,
    onInputChange,
    onFocusChange,
    onSubmit,
    onOpenStopConfirm,
    onStopCurrentRequest,
    onManageSettings,
  } = props;

  return (
    <>
      <div className="rounded-[28px] border border-border/60 bg-background/95 p-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.2)] dark:shadow-[0_16px_36px_-32px_rgba(0,0,0,0.48)]">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              disabled={isBusy}
              onFocus={() => onFocusChange(true)}
              onBlur={() => onFocusChange(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Ask anything about TaskFlow..."
              className="max-h-44 min-h-[40px] border-0 bg-transparent px-1 py-1.5 pr-1 text-sm leading-6 shadow-none focus-visible:ring-0 overflow-y-auto"
              autoGrow
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end">
            {hasTrackedRequest ? (
              <Popover open={isStopConfirmOpen} onOpenChange={onOpenStopConfirm}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-full border-border/70 bg-background/90 text-foreground shadow-sm hover:bg-muted hover:text-foreground"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span className="sr-only">Stop current run</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" className="w-80 rounded-3xl border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Stop current run?</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        This will stop the assistant from continuing this response. If a write has already started, completed changes will remain.
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="ghost" className="rounded-full px-4" onClick={() => onOpenStopConfirm(false)}>
                        Keep running
                      </Button>
                      <Button type="button" variant="outline" className="rounded-full px-4" onClick={onStopCurrentRequest}>
                        Stop now
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
            <Button
              type="button"
              size="icon"
              className="group h-10 w-10 rounded-full shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_12px_24px_-16px_hsl(var(--primary)/0.75)] disabled:hover:translate-y-0 disabled:hover:scale-100"
              onClick={onSubmit}
              disabled={!input.trim() || isBusy || isAvailabilityChecking}
            >
              {hasTrackedRequest || isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              <span className="sr-only">{hasTrackedRequest || isExecuting ? 'Working' : 'Send message'}</span>
            </Button>
          </div>
        </div>
        {hasLongWaitNotice ? (
          <div className="mt-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Still working. You can stop this run if needed.
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>Desktop only</span>
        <Button
          type="button"
          variant="ghost"
          className="h-auto rounded-full px-0 py-0 text-[11px] font-semibold text-primary hover:bg-transparent hover:text-primary/80"
          onClick={onManageSettings}
        >
          Manage in settings
          <ChevronsRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </>
  );
}

