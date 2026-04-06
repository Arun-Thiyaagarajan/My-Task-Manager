'use client';

import { Bot, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { sanitizeAssistantVisibleMessage } from './assistant-policy';
import { useAIAssistantController } from './use-ai-assistant-controller';
import { AssistantLauncher } from './assistant-launcher';
import { AssistantChatHeader } from './assistant-chat-header';
import { AssistantMessages } from './assistant-messages';
import { AssistantSuggestionsPanel } from './assistant-suggestions-panel';
import { AssistantComposer } from './assistant-composer';
import { NoteEditorDialog } from '@/components/note-editor-dialog';

export function AIAssistant() {
  const { state, derived, actions } = useAIAssistantController();

  if (!derived.canRender || !derived.activeSession) {
    return null;
  }

  return (
    <TooltipProvider>
      <Sheet open={state.isOpen} onOpenChange={actions.setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <AssistantLauncher />
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Open AI assistant</TooltipContent>
        </Tooltip>

        <SheetContent
          side="right"
          hideClose
          className="flex w-[min(30rem,calc(100vw-1rem))] max-w-none sm:max-w-none flex-col gap-0 overflow-hidden border-l border-border/60 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card)/0.96)_100%)] p-0"
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-semibold">TaskFlow Copilot</SheetTitle>
                    <SheetDescription className="text-xs leading-5">
                      Desktop-only workspace assistant with preview-before-confirm writes.
                    </SheetDescription>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => actions.setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="hidden 2xl:flex flex-wrap items-center gap-2 border-b border-border/50 px-5 py-3">
            <Badge
              variant="outline"
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold',
                state.availability?.available === false
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-primary/20 bg-primary/5 text-primary'
              )}
            >
              {state.availability?.available === false ? 'AI unavailable' : 'Desktop assistant'}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold">
              Writes require confirmation
            </Badge>
          </div>

          <AssistantChatHeader
            activeSession={derived.activeSession}
            activeSessionId={state.activeSessionId}
            sessions={state.sessions}
            isBusy={derived.isBusy}
            isChatManagerCollapsed={state.isChatManagerCollapsed}
            isRefreshingSession={state.isRefreshingSession}
            sessionDeleteConfirmId={state.sessionDeleteConfirmId}
            setIsChatManagerCollapsed={actions.setIsChatManagerCollapsed}
            setSessionDeleteConfirmId={actions.setSessionDeleteConfirmId}
            onStartNewChat={actions.handleStartNewChat}
            onRefreshCurrentSession={actions.handleRefreshCurrentSession}
            onClearCurrentChat={actions.handleClearCurrentChat}
            onSwitchSession={actions.handleSwitchSession}
            onDeleteSession={actions.handleDeleteSession}
            hasAssistantSessionUserPrompts={actions.hasAssistantSessionUserPrompts}
          />

          <AssistantMessages
            isRefreshingSession={state.isRefreshingSession}
            messages={state.messages}
            hasTrackedRequest={state.hasTrackedRequest}
            pendingPlan={state.pendingPlan}
            isExecuting={state.isExecuting}
            followUpHref={state.followUpHref}
            followUpLabel={state.followUpLabel}
            assistantCta={state.assistantCta}
            isBusy={derived.isBusy}
            starterPrompts={derived.starterPrompts}
            onCancelPlan={actions.handleCancelPlan}
            onConfirmPlan={actions.handleConfirmPlan}
            onNavigateFollowUp={actions.navigateWithLoader}
            onAuthenticateCta={(cta) => {
              if (!cta) return;
              if (cta.mode === 'auth') {
                window.dispatchEvent(new Event('open-auth-modal'));
                return;
              }
              if (cta.href) actions.navigateWithLoader(cta.href);
            }}
            onSelectStarterPrompt={actions.setInput}
          />

          <Separator />

          <div className="space-y-3 px-5 py-4">
            {state.availability?.available === false ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-xs leading-5 text-destructive [overflow-wrap:anywhere] whitespace-pre-wrap break-words">
                {sanitizeAssistantVisibleMessage(state.availability.reason)}
              </div>
            ) : null}

            <AssistantSuggestionsPanel
              show={derived.showPromptSuggestions}
              isSuggestionsLoading={state.isSuggestionsLoading}
              displayPromptSuggestions={state.displayPromptSuggestions}
              normalizedInput={derived.normalizedInput}
              onDismiss={() => actions.setDismissedSuggestionDraft(derived.normalizedInput)}
              onSelect={(text) => {
                actions.setInput(text);
                actions.setIsInputFocused(true);
              }}
            />

            <AssistantComposer
              input={state.input}
              isBusy={derived.isBusy}
              isAvailabilityChecking={derived.isAvailabilityChecking}
              hasTrackedRequest={state.hasTrackedRequest}
              isExecuting={state.isExecuting}
              isStopConfirmOpen={state.isStopConfirmOpen}
              hasLongWaitNotice={state.hasLongWaitNotice}
              onInputChange={actions.setInput}
              onFocusChange={actions.setIsInputFocused}
              onSubmit={actions.handleSubmit}
              onOpenStopConfirm={actions.setIsStopConfirmOpen}
              onStopCurrentRequest={actions.handleStopCurrentRequest}
              onManageSettings={() => actions.navigateWithLoader('/settings?section=features#settings-features-card')}
            />
          </div>
        </SheetContent>
      </Sheet>
      <NoteEditorDialog
        isOpen={state.isNoteEditorOpen}
        onOpenChange={(open) => {
          actions.setIsNoteEditorOpen(open);
          if (!open) actions.setActiveNoteEditorNote(null);
        }}
        note={state.activeNoteEditorNote}
        onSave={actions.handleSaveAssistantNote}
      />
    </TooltipProvider>
  );
}
