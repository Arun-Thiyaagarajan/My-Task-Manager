'use client';

import type { AssistantMessage, AssistantPlan, AssistantPlannedAction } from '@/lib/ai-assistant';
import type { Note, UiConfig } from '@/lib/types';

export type AssistantChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessage[];
};

export type PromptSuggestion = {
  id: string;
  text: string;
  source: 'suggested' | 'history';
};

export type AssistantIntentSummary = {
  key: string;
  label: string;
  count: number;
};

export type AssistantAccessPolicyResult = {
  status: 'allowed' | 'requires_auth' | 'restricted';
  message?: string;
  cta?: {
    label: string;
    mode: 'auth' | 'navigate';
    href?: string;
  };
};

export type AssistantTaskDraftState = {
  task: NonNullable<AssistantPlannedAction['task']>;
  sourcePrompt: string;
};

export type AssistantNoteDraftState = {
  note: NonNullable<AssistantPlannedAction['note']>;
  sourcePrompt: string;
};

export type AssistantAvailabilityState = {
  available: boolean;
  reason: string;
};

export type AssistantControllerState = {
  mounted: boolean;
  isOpen: boolean;
  input: string;
  uiConfig: UiConfig | null;
  messages: AssistantMessage[];
  sessions: AssistantChatSession[];
  activeSessionId: string | null;
  isChatManagerCollapsed: boolean;
  isInputFocused: boolean;
  dismissedSuggestionDraft: string | null;
  pendingPlan: AssistantPlan | null;
  availability: AssistantAvailabilityState | null;
  followUpHref: string | null;
  followUpLabel: string | null;
  assistantCta: AssistantAccessPolicyResult['cta'] | null;
  pendingTaskDraft: AssistantTaskDraftState | null;
  pendingNoteDraft: AssistantNoteDraftState | null;
  activeNoteEditorNote: Partial<Note> | null;
  isNoteEditorOpen: boolean;
  displayPromptSuggestions: PromptSuggestion[];
  isSuggestionsLoading: boolean;
  sessionDeleteConfirmId: string | null;
  isRefreshingSession: boolean;
  isStopConfirmOpen: boolean;
  hasLongWaitNotice: boolean;
  hasTrackedRequest: boolean;
  isSubmitting: boolean;
  isExecuting: boolean;
};
