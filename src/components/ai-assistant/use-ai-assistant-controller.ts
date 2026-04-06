'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAiAssistantAvailability, planAssistantAction } from '@/ai/flows/assistant-planner-flow';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFirebase } from '@/firebase';
import {
  addNote,
  checkUniqueness,
  getAuthMode,
  getLocalProfile,
  getUiConfig,
  updateNote,
} from '@/lib/data';
import {
  type AssistantMessage,
  isAssistantMutationAction,
} from '@/lib/ai-assistant';
import type { Note, UiConfig } from '@/lib/types';
import {
  buildAssistantContext,
  buildAssistantDirectIntentPlan,
  buildAssistantNoteDraftPrompt,
  buildAssistantTaskDraftPrompt,
  buildLocalAssistantFallbackPlan,
  getMissingRequiredAssistantTaskFields,
  parseAssistantNoteDetails,
  resolveAssistantCustomFields,
} from './assistant-context';
import { executeAssistantAction } from './assistant-actions';
import {
  formatAssistantContent,
  getAssistantCapabilitiesMessage,
  getFutureEnhancementMessage,
  getGeneralConversationResponse,
  getLocalHelpResponse,
  getSafetyResponse,
  isAssistantCancelIntent,
  isAssistantPlannerUnavailableMessage,
  isCapabilitiesPrompt,
  sanitizeAssistantRuntimeErrorMessage,
  sanitizeAssistantVisibleMessage,
  shouldShowFutureEnhancementFollowUp,
  evaluateAssistantAccessPolicy,
} from './assistant-policy';
import {
  getAssistantStarterPrompts,
  getPromptSuggestionMatches,
} from './assistant-suggestions';
import type {
  AssistantAccessPolicyResult,
  AssistantAvailabilityState,
  AssistantChatSession,
  AssistantControllerState,
  AssistantNoteDraftState,
  AssistantTaskDraftState,
  PromptSuggestion,
} from './assistant-types';
import {
  ASSISTANT_ACTIVE_CHAT_KEY,
  ASSISTANT_CHAT_MANAGER_COLLAPSED_KEY,
  ASSISTANT_CHAT_STORAGE_KEY,
  createChatSession,
  createInitialAssistantMessage,
  createMessage,
  getAssistantRole,
  getAssistantStorageKey,
  getAssistantUserLabel,
  getAssistantUserScope,
  getSessionTitleFromMessages,
  hasAssistantSessionUserPrompts,
  loadAssistantSessions,
  normalize,
  omitUndefined,
} from './assistant-utils';

function resolveStatus(status: string | undefined, uiConfig: UiConfig) {
  if (!status) return undefined;
  const normalizedStatus = normalize(status);
  const exact = uiConfig.taskStatuses.find((candidate) => normalize(candidate) === normalizedStatus);
  if (exact) return exact;
  const partial = uiConfig.taskStatuses.filter((candidate) => normalize(candidate).includes(normalizedStatus));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new Error(`Multiple statuses matched "${status}". Please be more specific.`);
  throw new Error(`No status matched "${status}".`);
}

function resolveRepositories(repositories: string[] | undefined, uiConfig: UiConfig) {
  if (!repositories?.length) return undefined;

  return repositories.map((repository) => {
    const normalizedRepository = normalize(repository);
    const exact = uiConfig.repositoryConfigs.find((candidate) => normalize(candidate.name) === normalizedRepository);
    if (exact) return exact.name;

    const partial = uiConfig.repositoryConfigs.filter((candidate) =>
      normalize(candidate.name).includes(normalizedRepository)
    );
    if (partial.length === 1) return partial[0].name;
    if (partial.length > 1) throw new Error(`Multiple repositories matched "${repository}". Please be more specific.`);
    throw new Error(`No repository matched "${repository}".`);
  });
}

export function useAIAssistantController() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, userProfile } = useFirebase();

  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [uiConfig, setUiConfig] = React.useState<UiConfig | null>(null);
  const [messages, setMessages] = React.useState<AssistantMessage[]>([createInitialAssistantMessage()]);
  const [sessions, setSessions] = React.useState<AssistantChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [isChatManagerCollapsed, setIsChatManagerCollapsed] = React.useState(true);
  const [isInputFocused, setIsInputFocused] = React.useState(false);
  const [dismissedSuggestionDraft, setDismissedSuggestionDraft] = React.useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = React.useState<AssistantControllerState['pendingPlan']>(null);
  const [availability, setAvailability] = React.useState<AssistantAvailabilityState | null>(null);
  const [followUpHref, setFollowUpHref] = React.useState<string | null>(null);
  const [followUpLabel, setFollowUpLabel] = React.useState<string | null>(null);
  const [assistantCta, setAssistantCta] = React.useState<AssistantAccessPolicyResult['cta'] | null>(null);
  const [pendingTaskDraft, setPendingTaskDraft] = React.useState<AssistantTaskDraftState | null>(null);
  const [pendingNoteDraft, setPendingNoteDraft] = React.useState<AssistantNoteDraftState | null>(null);
  const [activeNoteEditorNote, setActiveNoteEditorNote] = React.useState<Partial<Note> | null>(null);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = React.useState(false);
  const [displayPromptSuggestions, setDisplayPromptSuggestions] = React.useState<PromptSuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = React.useState(false);
  const [sessionDeleteConfirmId, setSessionDeleteConfirmId] = React.useState<string | null>(null);
  const [isRefreshingSession, setIsRefreshingSession] = React.useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = React.useState(false);
  const [hasLongWaitNotice, setHasLongWaitNotice] = React.useState(false);
  const [hasTrackedRequest, setHasTrackedRequest] = React.useState(false);
  const [isSubmitting, startSubmitting] = React.useTransition();
  const [isExecuting, startExecuting] = React.useTransition();

  const requestSequenceRef = React.useRef(0);
  const activeRequestIdRef = React.useRef<number | null>(null);
  const canceledRequestIdsRef = React.useRef<Set<number>>(new Set());
  const longWaitTimerRef = React.useRef<number | null>(null);

  const authMode = getAuthMode();
  const assistantRole = getAssistantRole(authMode, userProfile?.role);
  const localProfile = getLocalProfile();
  const assistantUserScope = React.useMemo(
    () =>
      getAssistantUserScope({
        authMode,
        localUsername: localProfile.username,
        cloudUserId: user?.uid,
        cloudUsername: userProfile?.username || user?.displayName,
        cloudEmail: user?.email,
      }),
    [authMode, localProfile.username, user?.displayName, user?.email, user?.uid, userProfile?.username]
  );
  const assistantUserLabel = React.useMemo(
    () =>
      getAssistantUserLabel({
        authMode,
        localUsername: localProfile.username,
        cloudUsername: userProfile?.username || user?.displayName,
        cloudEmail: user?.email,
      }),
    [authMode, localProfile.username, user?.displayName, user?.email, userProfile?.username]
  );

  const refreshConfig = React.useCallback(() => {
    setUiConfig(getUiConfig());
  }, []);

  React.useEffect(() => {
    setMounted(true);
    refreshConfig();
    const stored = loadAssistantSessions(assistantUserScope);
    setSessions(stored.sessions);
    setActiveSessionId(stored.activeSessionId);
    const activeSession = stored.sessions.find((session) => session.id === stored.activeSessionId) || stored.sessions[0];
    setMessages(activeSession?.messages || [createInitialAssistantMessage()]);
    const storedCollapsed = window.localStorage.getItem(ASSISTANT_CHAT_MANAGER_COLLAPSED_KEY);
    setIsChatManagerCollapsed(storedCollapsed !== 'false');

    window.addEventListener('company-changed', refreshConfig);
    window.addEventListener('storage', refreshConfig);

    return () => {
      window.removeEventListener('company-changed', refreshConfig);
      window.removeEventListener('storage', refreshConfig);
    };
  }, [assistantUserScope, refreshConfig]);

  React.useEffect(() => {
    if (!mounted || !activeSessionId) return;
    setSessions((current) => {
      const existingIndex = current.findIndex((session) => session.id === activeSessionId);
      const timestamp = new Date().toISOString();

      if (existingIndex === -1) {
        return [
          {
            id: activeSessionId,
            title: getSessionTitleFromMessages(messages),
            createdAt: timestamp,
            updatedAt: timestamp,
            messages,
          },
          ...current,
        ];
      }

      return current.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              title: getSessionTitleFromMessages(messages),
              updatedAt: timestamp,
              messages,
            }
          : session
      );
    });
  }, [activeSessionId, messages, mounted]);

  React.useEffect(() => {
    if (!mounted || !sessions.length) return;
    window.localStorage.setItem(getAssistantStorageKey(ASSISTANT_CHAT_STORAGE_KEY, assistantUserScope), JSON.stringify(sessions));
    if (activeSessionId) {
      window.localStorage.setItem(getAssistantStorageKey(ASSISTANT_ACTIVE_CHAT_KEY, assistantUserScope), activeSessionId);
    }
  }, [activeSessionId, assistantUserScope, mounted, sessions]);

  React.useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(ASSISTANT_CHAT_MANAGER_COLLAPSED_KEY, String(isChatManagerCollapsed));
  }, [isChatManagerCollapsed, mounted]);

  React.useEffect(() => {
    if (!isOpen || availability) return;
    startSubmitting(async () => {
      try {
        const nextAvailability = await getAiAssistantAvailability();
        setAvailability(nextAvailability);
      } catch (error) {
        setAvailability({
          available: false,
          reason: sanitizeAssistantVisibleMessage(
            error instanceof Error ? error.message : 'AI availability could not be checked.'
          ),
        });
      }
    });
  }, [availability, isOpen]);

  React.useEffect(() => {
    return () => {
      if (longWaitTimerRef.current !== null) {
        window.clearTimeout(longWaitTimerRef.current);
      }
    };
  }, []);

  const assistantEnabled = uiConfig?.aiAssistantEnabled !== false;
  const isBusy = isSubmitting || isExecuting;
  const isAvailabilityChecking = isOpen && availability === null;
  const normalizedInput = React.useMemo(() => normalize(input), [input]);
  const activeSession = React.useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions]
  );
  const promptSuggestions = React.useMemo(
    () => getPromptSuggestionMatches(input, sessions),
    [input, sessions]
  );
  const starterPrompts = React.useMemo(
    () => getAssistantStarterPrompts(sessions, `${activeSessionId || 'assistant'}-${messages.length}`),
    [activeSessionId, messages.length, sessions]
  );

  React.useEffect(() => {
    if (availability?.available === false || normalizedInput.length < 2) {
      setIsSuggestionsLoading(false);
      setDisplayPromptSuggestions([]);
      return;
    }

    if (isBusy) {
      setIsSuggestionsLoading(false);
      return;
    }

    setIsSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      setDisplayPromptSuggestions((current) => {
        if (promptSuggestions.length) {
          return promptSuggestions;
        }
        return current.length ? current : [];
      });
      setIsSuggestionsLoading(false);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [availability?.available, isBusy, normalizedInput.length, promptSuggestions]);

  const showPromptSuggestions =
    !pendingPlan &&
    !isBusy &&
    availability?.available !== false &&
    (isSuggestionsLoading || displayPromptSuggestions.length > 0) &&
    dismissedSuggestionDraft !== normalizedInput &&
    (isInputFocused || input.trim().length > 0);

  const pushAssistantMessage = React.useCallback((content: string) => {
    setMessages((current) => [
      ...current,
      createMessage('assistant', formatAssistantContent(sanitizeAssistantVisibleMessage(content))),
    ]);
  }, []);

  const clearAssistantEphemeralState = React.useCallback(() => {
    setPendingPlan(null);
    setFollowUpHref(null);
    setFollowUpLabel(null);
    setAssistantCta(null);
    setPendingTaskDraft(null);
    setPendingNoteDraft(null);
  }, []);

  const navigateWithLoader = React.useCallback(
    (href: string) => {
      window.dispatchEvent(new Event('navigation-start'));
      router.push(href);
      setIsOpen(false);
    },
    [router]
  );

  const clearLongWaitTimer = React.useCallback(() => {
    if (longWaitTimerRef.current !== null) {
      window.clearTimeout(longWaitTimerRef.current);
      longWaitTimerRef.current = null;
    }
  }, []);

  const beginTrackedRequest = React.useCallback(() => {
    const requestId = ++requestSequenceRef.current;
    activeRequestIdRef.current = requestId;
    setHasTrackedRequest(true);
    setHasLongWaitNotice(false);
    clearLongWaitTimer();
    longWaitTimerRef.current = window.setTimeout(() => {
      if (activeRequestIdRef.current === requestId) {
        setHasLongWaitNotice(true);
        pushAssistantMessage('This is taking a little longer than usual. I’m still working through it and you can stop the current run if needed.');
      }
    }, 15000);
    return requestId;
  }, [clearLongWaitTimer, pushAssistantMessage]);

  const finishTrackedRequest = React.useCallback((requestId: number) => {
    if (activeRequestIdRef.current === requestId) {
      activeRequestIdRef.current = null;
      setHasTrackedRequest(false);
      clearLongWaitTimer();
      setHasLongWaitNotice(false);
      setIsStopConfirmOpen(false);
    }
  }, [clearLongWaitTimer]);

  const isRequestCanceled = React.useCallback((requestId: number) => {
    return canceledRequestIdsRef.current.has(requestId);
  }, []);

  const handleStopCurrentRequest = React.useCallback(() => {
    const requestId = activeRequestIdRef.current;
    if (requestId === null) return;
    canceledRequestIdsRef.current.add(requestId);
    finishTrackedRequest(requestId);
    setPendingPlan(null);
    setIsStopConfirmOpen(false);
    pushAssistantMessage('Stopped the current run. You can ask a new question whenever you’re ready.');
  }, [finishTrackedRequest, pushAssistantMessage]);

  const handleSaveAssistantNote = React.useCallback((id: string | undefined, title: string, content: string) => {
    if (!title.trim() && !content.trim()) {
      toast({ variant: 'destructive', title: 'Cannot save empty note.' });
      return;
    }

    if (id) {
      updateNote(id, { title, content });
      toast({ variant: 'success', title: 'Note Updated' });
    } else {
      addNote({ title, content });
      toast({ variant: 'success', title: 'Note Saved' });
    }

    window.dispatchEvent(new Event('notes-updated'));
    setIsNoteEditorOpen(false);
    setActiveNoteEditorNote(null);
  }, [toast]);

  const handleExecuteAction = React.useCallback(
    async (action: import('@/lib/ai-assistant').AssistantPlannedAction) =>
      executeAssistantAction(action, {
        authMode,
        role: assistantRole,
        navigateWithLoader,
        setFollowUpHref,
        setFollowUpLabel,
        setAssistantCta,
        setActiveNoteEditorNote,
        setIsNoteEditorOpen,
      }),
    [assistantRole, authMode, navigateWithLoader]
  );

  const handleSubmit = React.useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    if (trimmed.length < 3) {
      toast({
        variant: 'warning',
        title: 'Ask a little more detail',
        description: 'Give the assistant a slightly more specific request so it can plan the right action.',
      });
      return;
    }
    if (trimmed.length > 2000) {
      toast({
        variant: 'warning',
        title: 'Message too long',
        description: 'Please keep the request under 2000 characters for a cleaner assistant response.',
      });
      return;
    }

    if ((pendingTaskDraft || pendingNoteDraft) && isAssistantCancelIntent(trimmed)) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage(
          'assistant',
          pendingTaskDraft
            ? 'Stopped the task creation draft. Nothing has been created, and you can start again whenever you want.'
            : 'Stopped the note draft. Nothing has been created, and you can start again whenever you want.'
        ),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      return;
    }

    if (pendingNoteDraft) {
      const parsedNoteDetails = parseAssistantNoteDetails(trimmed);
      if (parsedNoteDetails.hasStructuredDetails) {
        const nextNoteDraft = omitUndefined({
          title: parsedNoteDetails.title ?? pendingNoteDraft.note.title,
          content: parsedNoteDetails.content ?? pendingNoteDraft.note.content,
        });

        setMessages((current) => [...current, createMessage('user', trimmed)]);
        setInput('');
        setDismissedSuggestionDraft(null);
        setFollowUpHref(null);
        setFollowUpLabel(null);
        setAssistantCta(null);
        setPendingNoteDraft({
          note: nextNoteDraft,
          sourcePrompt: pendingNoteDraft.sourcePrompt,
        });
        setPendingPlan({
          message: 'I captured those note details. Please review them below before I create the note.',
          actions: [
            {
              type: 'create_note',
              label: 'Create note',
              explanation: 'This note will be created in your desktop notes workspace.',
              note: nextNoteDraft,
            },
          ],
          needsConfirmation: true,
        });
        return;
      }
    }

    const accessPolicy = evaluateAssistantAccessPolicy(trimmed, {
      authMode,
      role: assistantRole,
    });

    if (accessPolicy.status !== 'allowed') {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage('assistant', accessPolicy.message || 'That request is not available here.'),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      setAssistantCta(accessPolicy.cta || null);
      return;
    }

    const safetyResponse = getSafetyResponse(trimmed);
    if (safetyResponse) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage('assistant', safetyResponse),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      return;
    }

    if (isCapabilitiesPrompt(trimmed)) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage('assistant', getAssistantCapabilitiesMessage(assistantRole, authMode)),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      return;
    }

    const generalConversationResponse = getGeneralConversationResponse(trimmed);
    if (generalConversationResponse) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage('assistant', generalConversationResponse),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      return;
    }

    const normalizedTrimmed = normalize(trimmed);
    const isGenericCreateNotePrompt =
      normalizedTrimmed === 'create note' ||
      normalizedTrimmed === 'create a note' ||
      normalizedTrimmed === 'new note' ||
      normalizedTrimmed === 'add note' ||
      normalizedTrimmed === 'can you create note' ||
      normalizedTrimmed === 'can you create a note';

    if (isGenericCreateNotePrompt) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage(
          'assistant',
          'Sure. Please give at least a note title or some note content, like `Title - Release note` or `Content - Follow up with QA`, and I’ll continue from there.'
        ),
      ]);
      setPendingNoteDraft({
        note: {},
        sourcePrompt: trimmed,
      });
      setInput('');
      setDismissedSuggestionDraft(null);
      setPendingPlan(null);
      setFollowUpHref(null);
      setFollowUpLabel(null);
      setAssistantCta(null);
      return;
    }

    const isGenericCreateTaskPrompt =
      normalizedTrimmed === 'create task' ||
      normalizedTrimmed === 'create a task' ||
      normalizedTrimmed === 'new task' ||
      normalizedTrimmed === 'add task' ||
      normalizedTrimmed === 'can you create task' ||
      normalizedTrimmed === 'can you create a task';

    if (isGenericCreateTaskPrompt) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage(
          'assistant',
          'Sure. Please give the task title or a bit more detail, like `Create a task called QA sign-off` or `Create a task for release testing tomorrow`, and I’ll continue from there.'
        ),
      ]);
      setPendingTaskDraft({
        task: {},
        sourcePrompt: trimmed,
      });
      setInput('');
      setDismissedSuggestionDraft(null);
      setPendingPlan(null);
      setFollowUpHref(null);
      setFollowUpLabel(null);
      setAssistantCta(null);
      return;
    }

    const isGenericCreateTemplatePrompt =
      normalizedTrimmed === 'create template' ||
      normalizedTrimmed === 'create a template' ||
      normalizedTrimmed === 'new template' ||
      normalizedTrimmed === 'add template' ||
      normalizedTrimmed === 'can you create template' ||
      normalizedTrimmed === 'can you create a template';

    if (isGenericCreateTemplatePrompt) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage(
          'assistant',
          'Template creation through chat is not available yet. You can open the Templates page and create one there, and I can still help you open templates or prepare task details based on a template.'
        ),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      return;
    }

    const localHelpResponse = getLocalHelpResponse(trimmed);
    if (localHelpResponse) {
      setMessages((current) => [
        ...current,
        createMessage('user', trimmed),
        createMessage('assistant', localHelpResponse),
      ]);
      setInput('');
      setDismissedSuggestionDraft(null);
      clearAssistantEphemeralState();
      return;
    }

    const directIntentPlan = buildAssistantDirectIntentPlan(trimmed);
    if (directIntentPlan) {
      setMessages((current) => [...current, createMessage('user', trimmed)]);
      setInput('');
      setDismissedSuggestionDraft(null);
      setPendingPlan(null);
      setFollowUpHref(null);
      setFollowUpLabel(null);
      setAssistantCta(null);
      pushAssistantMessage(directIntentPlan.message);

      if (!directIntentPlan.actions.length) {
        return;
      }

      const requestId = beginTrackedRequest();
      startSubmitting(async () => {
        try {
          const executionMessages: string[] = [];
          for (const action of directIntentPlan.actions) {
            if (isRequestCanceled(requestId)) return;
            const result = await handleExecuteAction(action);
            if (result.message) executionMessages.push(result.message);
          }

          if (executionMessages.length) {
            pushAssistantMessage(executionMessages.join(' '));
          }
          finishTrackedRequest(requestId);
        } catch (error) {
          if (isRequestCanceled(requestId)) return;
          const description = sanitizeAssistantRuntimeErrorMessage(
            error instanceof Error ? error.message : 'The assistant could not complete that request.'
          );
          pushAssistantMessage(description);
          finishTrackedRequest(requestId);
        }
      });
      return;
    }

    setMessages((current) => [...current, createMessage('user', trimmed)]);
    setInput('');
    setDismissedSuggestionDraft(null);
    setPendingPlan(null);
    setFollowUpHref(null);
    setFollowUpLabel(null);
    setAssistantCta(null);
    const requestId = beginTrackedRequest();
    const plannerMessage = pendingTaskDraft
      ? buildAssistantTaskDraftPrompt(pendingTaskDraft.sourcePrompt, pendingTaskDraft.task, trimmed)
      : pendingNoteDraft
        ? buildAssistantNoteDraftPrompt(pendingNoteDraft.sourcePrompt, pendingNoteDraft.note, trimmed)
        : trimmed;

    startSubmitting(async () => {
      try {
        const plan = await planAssistantAction({
          message: plannerMessage,
          context: buildAssistantContext(pathname || '/', sessions, assistantUserLabel, {
            authMode,
            role: assistantRole,
          }),
        });

        if (isRequestCanceled(requestId)) return;

        pushAssistantMessage(plan.message);
        const actions = Array.isArray(plan.actions) ? plan.actions : [];
        const hasMutation = actions.some((action) => isAssistantMutationAction(action.type));
        const createTaskAction = actions.find((action) => action.type === 'create_task');
        const createNoteAction = actions.find((action) => action.type === 'create_note');

        if (createTaskAction?.task) {
          const nextUiConfig = getUiConfig();
          const resolvedCustomFields = resolveAssistantCustomFields(createTaskAction.task.customFields, nextUiConfig);
          const createTaskDraft = omitUndefined({
            title: createTaskAction.task.title,
            description: createTaskAction.task.description,
            status: createTaskAction.task.status ? resolveStatus(createTaskAction.task.status, nextUiConfig) : undefined,
            repositories: createTaskAction.task.repositories ? resolveRepositories(createTaskAction.task.repositories, nextUiConfig) : undefined,
            tags: createTaskAction.task.tags,
            reminder: createTaskAction.task.reminder ?? null,
            reminderExpiresAt: createTaskAction.task.reminderExpiresAt ?? null,
            customFields: resolvedCustomFields,
          });
          const missingFields = getMissingRequiredAssistantTaskFields(createTaskDraft, nextUiConfig);
          const uniqueness = checkUniqueness(createTaskDraft);

          if (!uniqueness.isUnique) {
            pushAssistantMessage(`I found an existing task using the unique ${uniqueness.fieldLabel || 'field'} value "${uniqueness.value}". Please change that value and I’ll continue with the new task.`);
            setPendingTaskDraft({
              task: createTaskAction.task,
              sourcePrompt: pendingTaskDraft?.sourcePrompt || trimmed,
            });
            finishTrackedRequest(requestId);
            return;
          }

          if (missingFields.length) {
            pushAssistantMessage(`I’ve got the task started. Please give the remaining required details: ${missingFields.join(', ')}. If you want to stop, just say cancel or stop.`);
            setPendingTaskDraft({
              task: createTaskAction.task,
              sourcePrompt: pendingTaskDraft?.sourcePrompt || trimmed,
            });
            finishTrackedRequest(requestId);
            return;
          }

          setPendingTaskDraft(null);
        }

        if (createNoteAction) {
          const noteDraft = omitUndefined({
            title: createNoteAction.note?.title?.trim(),
            content: createNoteAction.note?.content?.trim(),
          });
          if (!noteDraft.title && !noteDraft.content) {
            pushAssistantMessage('I can create that note. Please give at least a note title or some note content, and I’ll continue from there. If you want to stop, just say cancel or stop.');
            setPendingNoteDraft({
              note: createNoteAction.note || {},
              sourcePrompt: pendingNoteDraft?.sourcePrompt || trimmed,
            });
            finishTrackedRequest(requestId);
            return;
          }

          setPendingNoteDraft(null);
        }

        if (!actions.length) {
          if (shouldShowFutureEnhancementFollowUp(plan.message)) {
            pushAssistantMessage(getFutureEnhancementMessage(trimmed));
          }
          finishTrackedRequest(requestId);
          return;
        }

        if (hasMutation || plan.needsConfirmation) {
          setPendingPlan({ ...plan, actions });
          finishTrackedRequest(requestId);
          return;
        }

        const executionMessages: string[] = [];
        for (const action of actions) {
          if (isRequestCanceled(requestId)) return;
          const result = await handleExecuteAction(action);
          if (result.message) executionMessages.push(result.message);
        }

        if (executionMessages.length) {
          pushAssistantMessage(executionMessages.join(' '));
        }
        finishTrackedRequest(requestId);
      } catch (error) {
        if (isRequestCanceled(requestId)) return;
        const description = sanitizeAssistantRuntimeErrorMessage(
          error instanceof Error ? error.message : 'Something went wrong while planning that request.'
        );

        if (isAssistantPlannerUnavailableMessage(description)) {
          const fallbackPlan = buildLocalAssistantFallbackPlan(trimmed);
          if (fallbackPlan) {
            pushAssistantMessage(fallbackPlan.message);

            if (fallbackPlan.actions.length) {
              const executionMessages: string[] = [];
              for (const action of fallbackPlan.actions) {
                if (isRequestCanceled(requestId)) return;
                const result = await handleExecuteAction(action);
                if (result.message) executionMessages.push(result.message);
              }

              if (executionMessages.length) {
                pushAssistantMessage(executionMessages.join(' '));
              }
            }

            finishTrackedRequest(requestId);
            return;
          }

          pushAssistantMessage(
            'The AI planner is temporarily unavailable right now. Try a simple prompt like `Open dashboard`, `Open OT Template`, or `Create a note`, and I’ll keep using local fallback handling where possible.'
          );
          finishTrackedRequest(requestId);
          return;
        }

        pushAssistantMessage(description);
        toast({
          variant: 'destructive',
          title: 'Assistant unavailable',
          description,
        });
        finishTrackedRequest(requestId);
      }
    });
  }, [assistantRole, assistantUserLabel, authMode, beginTrackedRequest, clearAssistantEphemeralState, finishTrackedRequest, handleExecuteAction, input, isBusy, isRequestCanceled, pathname, pendingNoteDraft, pendingTaskDraft, pushAssistantMessage, sessions, toast]);

  const handleConfirmPlan = React.useCallback(() => {
    if (!pendingPlan?.actions.length || isExecuting) return;
    const requestId = beginTrackedRequest();

    startExecuting(async () => {
      try {
        const executionMessages: string[] = [];
        for (const action of pendingPlan.actions) {
          if (isRequestCanceled(requestId)) return;
          const result = await handleExecuteAction(action);
          if (result.message) executionMessages.push(result.message);
        }

        if (isRequestCanceled(requestId)) return;
        setPendingPlan(null);
        if (executionMessages.length) {
          pushAssistantMessage(executionMessages.join(' '));
        }

        toast({
          variant: 'success',
          title: 'Assistant changes applied',
          description: 'The requested action has been completed using your existing workspace data helpers.',
        });
        finishTrackedRequest(requestId);
      } catch (error) {
        if (isRequestCanceled(requestId)) return;
        const description = sanitizeAssistantRuntimeErrorMessage(
          error instanceof Error ? error.message : 'The assistant could not complete that action.'
        );
        pushAssistantMessage(description);
        toast({
          variant: 'destructive',
          title: 'Assistant action failed',
          description,
        });
        finishTrackedRequest(requestId);
      }
    });
  }, [beginTrackedRequest, finishTrackedRequest, handleExecuteAction, isExecuting, isRequestCanceled, pendingPlan, pushAssistantMessage, toast]);

  const handleCancelPlan = React.useCallback(() => {
    clearAssistantEphemeralState();
    pushAssistantMessage('Okay, I did not change anything.');
  }, [clearAssistantEphemeralState, pushAssistantMessage]);

  const handleStartNewChat = React.useCallback(() => {
    if (isBusy) return;
    const nextSession = createChatSession();
    setSessions((current) => [nextSession, ...current]);
    setActiveSessionId(nextSession.id);
    setMessages(nextSession.messages);
    setInput('');
    clearAssistantEphemeralState();
  }, [clearAssistantEphemeralState, isBusy]);

  const handleSwitchSession = React.useCallback((sessionId: string) => {
    if (isBusy) return;
    const nextSession = sessions.find((session) => session.id === sessionId);
    if (!nextSession) return;
    setActiveSessionId(sessionId);
    setMessages(nextSession.messages);
    setInput('');
    clearAssistantEphemeralState();
  }, [clearAssistantEphemeralState, isBusy, sessions]);

  const handleClearCurrentChat = React.useCallback(() => {
    if (isBusy) return;
    setMessages([createInitialAssistantMessage()]);
    setInput('');
    clearAssistantEphemeralState();
  }, [clearAssistantEphemeralState, isBusy]);

  const handleRefreshCurrentSession = React.useCallback(() => {
    if (isBusy || !activeSessionId) return;
    setIsRefreshingSession(true);
    refreshConfig();

    window.setTimeout(() => {
      const stored = loadAssistantSessions(assistantUserScope);
      const nextActiveSession =
        stored.sessions.find((session) => session.id === activeSessionId) ||
        stored.sessions.find((session) => session.id === stored.activeSessionId) ||
        stored.sessions[0] ||
        null;

      if (nextActiveSession) {
        setSessions(stored.sessions);
        setActiveSessionId(nextActiveSession.id);
        setMessages(nextActiveSession.messages);
      }

      setIsRefreshingSession(false);
    }, 220);
  }, [activeSessionId, assistantUserScope, isBusy, refreshConfig]);

  const handleDeleteSession = React.useCallback((sessionId: string) => {
    if (isBusy) return;

    const remaining = sessions.filter((session) => session.id !== sessionId);
    if (!remaining.length) {
      const nextSession = createChatSession();
      setSessions([nextSession]);
      setActiveSessionId(nextSession.id);
      setMessages(nextSession.messages);
    } else {
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
      }
    }

    setInput('');
    clearAssistantEphemeralState();
  }, [activeSessionId, clearAssistantEphemeralState, isBusy, sessions]);

  return {
    state: {
      mounted,
      isOpen,
      input,
      uiConfig,
      messages,
      sessions,
      activeSessionId,
      isChatManagerCollapsed,
      isInputFocused,
      dismissedSuggestionDraft,
      pendingPlan,
      availability,
      followUpHref,
      followUpLabel,
      assistantCta,
      pendingTaskDraft,
      pendingNoteDraft,
      activeNoteEditorNote,
      isNoteEditorOpen,
      displayPromptSuggestions,
      isSuggestionsLoading,
      sessionDeleteConfirmId,
      isRefreshingSession,
      isStopConfirmOpen,
      hasLongWaitNotice,
      hasTrackedRequest,
      isSubmitting,
      isExecuting,
    } satisfies AssistantControllerState,
    derived: {
      isMobile,
      assistantEnabled,
      isBusy,
      isAvailabilityChecking,
      normalizedInput,
      activeSession,
      showPromptSuggestions,
      starterPrompts,
      assistantRole,
      authMode,
      canRender: mounted && !isMobile && !!assistantEnabled && !!activeSession,
    },
    actions: {
      setIsOpen,
      setInput,
      setIsInputFocused,
      setDismissedSuggestionDraft,
      setIsChatManagerCollapsed,
      setSessionDeleteConfirmId,
      setIsStopConfirmOpen,
      setIsNoteEditorOpen,
      setActiveNoteEditorNote,
      navigateWithLoader,
      handleSubmit,
      handleConfirmPlan,
      handleCancelPlan,
      handleStartNewChat,
      handleSwitchSession,
      handleClearCurrentChat,
      handleRefreshCurrentSession,
      handleDeleteSession,
      handleStopCurrentRequest,
      handleSaveAssistantNote,
      hasAssistantSessionUserPrompts,
    },
  };
}
