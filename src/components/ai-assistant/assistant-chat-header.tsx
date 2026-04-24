'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp, Clock3, MessageSquare, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AssistantChatSession } from './assistant-types';

type Props = {
  activeSession: AssistantChatSession;
  activeSessionId: string | null;
  sessions: AssistantChatSession[];
  isBusy: boolean;
  isChatManagerCollapsed: boolean;
  isRefreshingSession: boolean;
  sessionDeleteConfirmId: string | null;
  setIsChatManagerCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionDeleteConfirmId: (id: string | null) => void;
  onStartNewChat: () => void;
  onRefreshCurrentSession: () => void;
  onClearCurrentChat: () => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  hasAssistantSessionUserPrompts: (session: AssistantChatSession) => boolean;
};

export function AssistantChatHeader(props: Props) {
  const {
    activeSession,
    activeSessionId,
    sessions,
    isBusy,
    isChatManagerCollapsed,
    isRefreshingSession,
    sessionDeleteConfirmId,
    setIsChatManagerCollapsed,
    setSessionDeleteConfirmId,
    onStartNewChat,
    onRefreshCurrentSession,
    onClearCurrentChat,
    onSwitchSession,
    onDeleteSession,
    hasAssistantSessionUserPrompts,
  } = props;
  const [isClearConfirmOpen, setIsClearConfirmOpen] = React.useState(false);

  return (
    <div className="border-b border-border/50 px-5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/12">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5 text-foreground">{activeSession.title}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <AppTooltip content={isChatManagerCollapsed ? 'Show chats' : 'Hide chats'}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setIsChatManagerCollapsed((current) => !current)}
              disabled={isBusy}
            >
              {isChatManagerCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              <span className="sr-only">{isChatManagerCollapsed ? 'Show chats' : 'Hide chats'}</span>
            </Button>
          </AppTooltip>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-full px-3 text-[11px] font-semibold shadow-none"
            onClick={onStartNewChat}
            disabled={isBusy}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New chat
          </Button>
          <AppTooltip content="Refresh current chat">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={onRefreshCurrentSession}
              disabled={isBusy || isRefreshingSession}
            >
              <RefreshCcw className={cn('h-4 w-4', isRefreshingSession && 'animate-spin')} />
              <span className="sr-only">Refresh current chat</span>
            </Button>
          </AppTooltip>
          <Popover open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
            <AppTooltip content="Clear current chat">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  disabled={isBusy}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear current chat</span>
                </Button>
              </PopoverTrigger>
            </AppTooltip>
            <PopoverContent
              align="end"
              side="bottom"
              className="w-64 rounded-3xl border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Clear this chat?</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    This will remove the current conversation messages and start fresh in the same chat.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setIsClearConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => {
                      onClearCurrentChat();
                      setIsClearConfirmOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div
        className={cn(
          'grid overflow-hidden transition-all duration-300 ease-out',
          isChatManagerCollapsed ? 'grid-rows-[0fr] opacity-0' : 'mt-1.5 grid-rows-[1fr] opacity-100'
        )}
      >
        <div className="min-h-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {sessions
              .slice()
              .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
              .map((session) => {
                const canDeleteSession = sessions.length > 1 || hasAssistantSessionUserPrompts(session);

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'group flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 transition-colors',
                      session.id === activeSessionId
                        ? 'border-primary/25 bg-primary/8 text-primary'
                        : 'border-border/70 bg-background/70 text-muted-foreground'
                    )}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-left text-[10.5px] font-medium leading-none"
                      onClick={() => onSwitchSession(session.id)}
                      disabled={isBusy}
                    >
                      <Clock3 className="h-3 w-3 shrink-0" />
                      <span className="max-w-[8.5rem] truncate">{session.title}</span>
                    </button>
                    {canDeleteSession ? (
                      <Popover
                        open={sessionDeleteConfirmId === session.id}
                        onOpenChange={(open) => setSessionDeleteConfirmId(open ? session.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            disabled={isBusy}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete chat</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          side="bottom"
                          className="w-64 rounded-3xl border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl"
                        >
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Delete this chat?</p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                This conversation history will be removed from this device.
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => setSessionDeleteConfirmId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-full bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  onDeleteSession(session.id);
                                  setSessionDeleteConfirmId(null);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
