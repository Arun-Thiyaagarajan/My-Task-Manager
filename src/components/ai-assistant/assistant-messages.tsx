'use client';

import * as React from 'react';
import { Check, Copy, ExternalLink, Loader2, RefreshCcw, Sparkles, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AssistantMessage, AssistantPlan } from '@/lib/ai-assistant';
import { cn } from '@/lib/utils';
import type { AssistantAccessPolicyResult, PromptSuggestion } from './assistant-types';
import { sanitizeAssistantVisibleMessage } from './assistant-policy';
import { describeAction } from './assistant-utils';
import { AssistantThinkingBubble } from './assistant-thinking-bubble';

type Props = {
  isRefreshingSession: boolean;
  messages: AssistantMessage[];
  hasTrackedRequest: boolean;
  pendingPlan: AssistantPlan | null;
  isExecuting: boolean;
  followUpHref: string | null;
  followUpLabel: string | null;
  assistantCta: AssistantAccessPolicyResult['cta'] | null;
  isBusy: boolean;
  starterPrompts: PromptSuggestion[];
  onCancelPlan: () => void;
  onConfirmPlan: () => void;
  onNavigateFollowUp: (href: string) => void;
  onAuthenticateCta: (cta: AssistantAccessPolicyResult['cta']) => void;
  onSelectStarterPrompt: (text: string) => void;
};

export function AssistantMessages(props: Props) {
  const {
    isRefreshingSession,
    messages,
    hasTrackedRequest,
    pendingPlan,
    isExecuting,
    followUpHref,
    followUpLabel,
    assistantCta,
    isBusy,
    starterPrompts,
    onCancelPlan,
    onConfirmPlan,
    onNavigateFollowUp,
    onAuthenticateCta,
    onSelectStarterPrompt,
  } = props;
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);

  const handleCopyMessage = React.useCallback(async (message: AssistantMessage) => {
    const nextContent =
      message.role === 'assistant' ? sanitizeAssistantVisibleMessage(message.content) : message.content;
    try {
      await navigator.clipboard.writeText(nextContent);
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? null : current));
      }, 1600);
    } catch {
      setCopiedMessageId(null);
    }
  }, []);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 px-5 py-5">
        {isRefreshingSession ? (
          <div className="rounded-[28px] border border-border/60 bg-background/85 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 animate-spin text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Refreshing chat
              </p>
            </div>
            <div className="mt-3 space-y-3">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-16 w-[86%] rounded-[22px]" />
              <Skeleton className="ml-auto h-14 w-[62%] rounded-[22px]" />
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('group flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={cn('flex max-w-[92%] items-start gap-2', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div
                className={cn(
                  'rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm [overflow-wrap:anywhere] whitespace-pre-wrap break-words',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border/60 bg-background/90 text-foreground'
                )}
              >
                {message.role === 'assistant' ? sanitizeAssistantVisibleMessage(message.content) : message.content}
              </div>
              <div className="pt-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        void handleCopyMessage(message);
                      }}
                    >
                      {copiedMessageId === message.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="sr-only">Copy message</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copiedMessageId === message.id ? 'Copied' : 'Copy message'}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}

        {hasTrackedRequest && !pendingPlan ? <AssistantThinkingBubble isExecuting={isExecuting} /> : null}

        {pendingPlan ? (
          <div className="rounded-[28px] border border-primary/20 bg-primary/[0.04] p-4 shadow-[0_14px_34px_-28px_hsl(var(--primary)/0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Ready for confirmation</p>
                <p className="text-xs text-muted-foreground">
                  Review the exact changes below before anything is written.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold text-primary">
                {pendingPlan.actions.length} action{pendingPlan.actions.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {pendingPlan.actions.map((action, index) => {
                const details = describeAction(action);
                return (
                  <div key={`${action.type}-${index}`} className="rounded-3xl border border-border/60 bg-background/90 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        {action.explanation ? (
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.explanation}</p>
                        ) : null}
                      </div>
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                        {action.type.replaceAll('_', ' ')}
                      </Badge>
                    </div>
                    {details.length ? (
                      <div className="mt-3 space-y-2">
                        {details.map((detail) => (
                          <div key={detail} className="rounded-2xl bg-muted/35 px-3 py-2 text-xs leading-5 text-foreground/90 [overflow-wrap:anywhere] whitespace-pre-wrap break-words">
                            {detail}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full px-5" onClick={onCancelPlan}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full px-5"
                onClick={onConfirmPlan}
                disabled={isExecuting}
              >
                {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Confirm
              </Button>
            </div>
          </div>
        ) : null}

        {!pendingPlan && followUpHref && followUpLabel ? (
          <div className="rounded-3xl border border-border/60 bg-background/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Next step ready</p>
                <p className="text-xs text-muted-foreground">Jump straight to the affected item.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => onNavigateFollowUp(followUpHref)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {followUpLabel}
              </Button>
            </div>
          </div>
        ) : null}

        {!pendingPlan && assistantCta ? (
          <div className="rounded-3xl border border-primary/15 bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.94))] p-4 shadow-[0_16px_34px_-30px_hsl(var(--primary)/0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Authentication available</p>
                <p className="text-xs text-muted-foreground">Sign in when you want account-aware or protected workspace features.</p>
              </div>
              <Button
                type="button"
                className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(228_92%_61%))] px-5 text-primary-foreground shadow-[0_16px_30px_-20px_hsl(var(--primary)/0.8)] hover:opacity-95"
                onClick={() => onAuthenticateCta(assistantCta)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {assistantCta.label}
              </Button>
            </div>
          </div>
        ) : null}

        {!isBusy && starterPrompts.length ? (
          <div className="rounded-[28px] border border-border/60 bg-background/80 p-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Suggested starts</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={isBusy}
                  className="rounded-full border border-border/70 bg-muted/30 px-3 py-2 text-left text-xs font-medium text-foreground/90 transition-colors hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                  onClick={() => onSelectStarterPrompt(prompt.text)}
                >
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}
