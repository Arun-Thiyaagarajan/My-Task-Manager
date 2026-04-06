'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsRight,
  Clock3,
  ExternalLink,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCcw,
  SendHorizonal,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { getAiAssistantAvailability, planAssistantAction } from '@/ai/flows/assistant-planner-flow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NoteEditorDialog } from '@/components/note-editor-dialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFirebase } from '@/firebase';
import {
  addGeneralReminder,
  addNote,
  addTask,
  checkUniqueness,
  deleteGeneralReminder,
  getAuthMode,
  getDevelopers,
  getGeneralReminders,
  getLocalProfile,
  getNotes,
  getTaskTemplates,
  getTasks,
  getTesters,
  getUiConfig,
  updateNote,
  updateTask,
} from '@/lib/data';
import type { FieldConfig, Note, Person, Task, TaskTemplate, UiConfig } from '@/lib/types';
import {
  type AssistantMessage,
  type AssistantPlannedAction,
  type AssistantPlan,
  isAssistantMutationAction,
} from '@/lib/ai-assistant';
import { cn, fuzzySearch } from '@/lib/utils';

const VETTED_ASSISTANT_PROMPTS = [
  'What can you do?',
  'How do I create a task?',
  'Open dashboard',
  'Open templates',
  'Open reminders',
  'Create a note',
  'Create a task',
  'Show me the logs page',
];

const FUTURE_ENHANCEMENT_MESSAGES = [
  'That prompt is not supported in the assistant yet. I have noted it as a future enhancement and I can still help with tasks, notes, reminders, navigation, and field updates today.',
  'That is not available in the current assistant scope yet. It would be a good future enhancement, and for now I can help with task creation, task updates, note changes, reminders, and navigation.',
  'I cannot complete that workflow through chat yet. It is something we can consider for a future enhancement, while the current assistant focuses on tasks, notes, reminders, and workspace navigation.',
];

const ASSISTANT_CHAT_STORAGE_KEY = 'taskflow_ai_assistant_sessions';
const ASSISTANT_ACTIVE_CHAT_KEY = 'taskflow_ai_assistant_active_session';
const ASSISTANT_CHAT_MANAGER_COLLAPSED_KEY = 'taskflow_ai_assistant_chat_manager_collapsed';
const ASSISTANT_CHAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const ASSISTANT_MEMORY_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'your',
  'about',
  'what',
  'when',
  'where',
  'which',
  'there',
  'their',
  'them',
  'then',
  'have',
  'will',
  'would',
  'should',
  'could',
  'please',
  'taskflow',
  'task',
  'tasks',
  'note',
  'notes',
  'page',
  'pages',
  'open',
  'show',
  'create',
  'update',
  'help',
]);

const ENTITY_NOISE_WORDS = new Set([
  'can',
  'could',
  'would',
  'will',
  'you',
  'me',
  'my',
  'please',
  'kindly',
  'just',
  'task',
  'tasks',
  'template',
  'templates',
  'note',
  'notes',
  'page',
  'open',
  'show',
  'find',
  'navigate',
  'go',
  'goto',
  'to',
  'the',
  'a',
  'an',
  'edit',
  'details',
  'view',
]);

const createMessage = (role: 'user' | 'assistant', content: string): AssistantMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
});

type AssistantChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessage[];
};

type PromptSuggestion = {
  id: string;
  text: string;
  source: 'suggested' | 'history';
};

type AssistantIntentSummary = {
  key: string;
  label: string;
  count: number;
};

type AssistantAccessPolicyResult = {
  status: 'allowed' | 'requires_auth' | 'restricted';
  message?: string;
  cta?: {
    label: string;
    mode: 'auth' | 'navigate';
    href?: string;
  };
};

type AssistantTaskDraftState = {
  task: NonNullable<AssistantPlannedAction['task']>;
  sourcePrompt: string;
};

type AssistantNoteDraftState = {
  note: NonNullable<AssistantPlannedAction['note']>;
  sourcePrompt: string;
};

const createInitialAssistantMessage = () =>
  createMessage(
    'assistant',
    'Ask me to open tasks, filter work, create notes, update task fields, explain features, or set reminders. I will preview every write before doing it.'
  );

const createChatSession = (title = 'New chat'): AssistantChatSession => {
  const timestamp = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [createInitialAssistantMessage()],
  };
};

function getSessionTitleFromMessages(messages: AssistantMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content?.trim();
  if (!firstUserMessage) return 'New chat';

  const cleaned = firstUserMessage
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(can you|could you|please|help me|i want to|show me|tell me|how do i|how to)\s+/i, '')
    .replace(/[?.!]+$/g, '')
    .trim();

  const compact = cleaned
    .split(' ')
    .slice(0, 6)
    .join(' ')
    .trim();

  if (!compact) return 'New chat';

  const titled = compact.charAt(0).toUpperCase() + compact.slice(1);
  return titled.length > 38 ? `${titled.slice(0, 37)}…` : titled;
}

function hasAssistantSessionUserPrompts(session: AssistantChatSession) {
  return session.messages.some((message) => message.role === 'user' && message.content.trim().length > 0);
}

function getAssistantStorageKey(baseKey: string, scopeKey: string) {
  return `${baseKey}:${scopeKey}`;
}

function loadAssistantSessions(scopeKey: string) {
  if (typeof window === 'undefined') {
    const initial = createChatSession();
    return { sessions: [initial], activeSessionId: initial.id };
  }

  try {
    const rawSessions = window.localStorage.getItem(getAssistantStorageKey(ASSISTANT_CHAT_STORAGE_KEY, scopeKey));
    const rawActiveSessionId = window.localStorage.getItem(getAssistantStorageKey(ASSISTANT_ACTIVE_CHAT_KEY, scopeKey));
    const parsedSessions = rawSessions ? JSON.parse(rawSessions) : [];

    const retentionCutoff = Date.now() - ASSISTANT_CHAT_RETENTION_MS;
    const sessions = Array.isArray(parsedSessions)
      ? parsedSessions.filter((session): session is AssistantChatSession => {
          if (!session?.id || !session?.title || !Array.isArray(session?.messages)) return false;
          const updatedAtMs = new Date(session.updatedAt || session.createdAt || 0).getTime();
          return Number.isFinite(updatedAtMs) && updatedAtMs >= retentionCutoff;
        })
      : [];

    if (!sessions.length) {
      const initial = createChatSession();
      return { sessions: [initial], activeSessionId: initial.id };
    }

    const activeSessionId =
      rawActiveSessionId && sessions.some((session) => session.id === rawActiveSessionId)
        ? rawActiveSessionId
        : sessions[0].id;

    return { sessions, activeSessionId };
  } catch {
    const initial = createChatSession();
    return { sessions: [initial], activeSessionId: initial.id };
  }
}

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function getAssistantRole(authMode: 'localStorage' | 'authenticate', role?: string | null) {
  if (authMode !== 'authenticate') return 'guest';
  return role === 'admin' ? 'admin' : 'user';
}

function isTruthyString(value: string) {
  return ['true', 'yes', 'on', 'checked', '1'].includes(normalize(value));
}

function isFalsyString(value: string) {
  return ['false', 'no', 'off', 'unchecked', '0'].includes(normalize(value));
}

function getAssistantUserScope(options: {
  authMode: 'localStorage' | 'authenticate';
  localUsername?: string | null;
  cloudUserId?: string | null;
  cloudUsername?: string | null;
  cloudEmail?: string | null;
}) {
  if (options.authMode === 'authenticate') {
    return `cloud:${normalize(options.cloudUserId || options.cloudUsername || options.cloudEmail || 'workspace-user')}`;
  }
  return `local:${normalize(options.localUsername || 'guest-user')}`;
}

function getAssistantUserLabel(options: {
  authMode: 'localStorage' | 'authenticate';
  localUsername?: string | null;
  cloudUsername?: string | null;
  cloudEmail?: string | null;
}) {
  if (options.authMode === 'authenticate') {
    return options.cloudUsername || options.cloudEmail || 'Cloud User';
  }
  return options.localUsername || 'Guest User';
}

function sanitizeEntityQuery(value: string | null | undefined) {
  return normalize(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !ENTITY_NOISE_WORDS.has(token))
    .join(' ')
    .trim();
}

function levenshteinDistance(source: string, target: string) {
  if (source === target) return 0;
  if (!source) return target.length;
  if (!target) return source.length;

  const matrix = Array.from({ length: source.length + 1 }, () => new Array<number>(target.length + 1).fill(0));

  for (let i = 0; i <= source.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= target.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[source.length][target.length];
}

function getEntitySimilarityScore(query: string, label: string, extraText = '') {
  const normalizedQuery = normalize(query);
  const cleanedQuery = sanitizeEntityQuery(query);
  const normalizedLabel = normalize(label);
  const cleanedLabel = sanitizeEntityQuery(label);
  const normalizedExtra = normalize(extraText);

  if (!normalizedQuery) return 0;
  if (normalizedLabel === normalizedQuery) return 1000;
  if (cleanedQuery && cleanedLabel === cleanedQuery) return 980;

  let score = 0;

  if (normalizedLabel.includes(normalizedQuery)) score += 320;
  if (cleanedQuery && cleanedLabel.includes(cleanedQuery)) score += 360;
  if (fuzzySearch(normalizedQuery, normalizedLabel)) score += 140;
  if (cleanedQuery && fuzzySearch(cleanedQuery, cleanedLabel || normalizedLabel)) score += 180;
  if (cleanedQuery && normalizedExtra.includes(cleanedQuery)) score += 80;

  const queryTokens = (cleanedQuery || normalizedQuery).split(/\s+/).filter(Boolean);
  const labelTokens = new Set((cleanedLabel || normalizedLabel).split(/\s+/).filter(Boolean));
  const tokenHits = queryTokens.filter((token) => labelTokens.has(token)).length;
  if (queryTokens.length > 0) {
    score += (tokenHits / queryTokens.length) * 260;
  }

  const distanceBase = cleanedQuery || normalizedQuery;
  const distanceTarget = cleanedLabel || normalizedLabel;
  if (distanceBase && distanceTarget) {
    const distance = levenshteinDistance(distanceBase, distanceTarget);
    const similarity = 1 - distance / Math.max(distanceBase.length, distanceTarget.length, 1);
    if (similarity > 0) {
      score += similarity * 240;
    }
  }

  return score;
}

function findBestEntityMatch<T>(
  query: string,
  items: T[],
  options: {
    getPrimaryText: (item: T) => string;
    getSecondaryText?: (item: T) => string;
  }
) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return { item: null as T | null, matches: [] as T[] };
  }

  const ranked = items
    .map((item) => ({
      item,
      score: getEntitySimilarityScore(
        query,
        options.getPrimaryText(item),
        options.getSecondaryText?.(item) || ''
      ),
    }))
    .filter((entry) => entry.score >= 220)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) {
    return { item: null as T | null, matches: [] as T[] };
  }

  if (ranked.length === 1) {
    return { item: ranked[0].item, matches: [ranked[0].item] };
  }

  const [first, second] = ranked;
  if (first.score - second.score >= 35) {
    return { item: first.item, matches: ranked.map((entry) => entry.item) };
  }

  return { item: null as T | null, matches: ranked.map((entry) => entry.item) };
}

function findTaskMatch(query: string, tasks: Task[]) {
  const { item, matches } = findBestEntityMatch(query, tasks, {
    getPrimaryText: (task) => task.title,
    getSecondaryText: (task) => task.description || '',
  });
  return { task: item, matches };
}

function findNoteMatch(query: string, notes: Note[]) {
  const { item, matches } = findBestEntityMatch(query, notes, {
    getPrimaryText: (note) => note.title || 'Untitled Note',
    getSecondaryText: (note) => note.content || '',
  });
  return { note: item, matches };
}

function findTemplateMatch(query: string, templates: TaskTemplate[]) {
  const { item, matches } = findBestEntityMatch(query, templates, {
    getPrimaryText: (template) => template.name,
    getSecondaryText: (template) => template.description || '',
  });
  return { template: item, matches };
}

function resolveNamesToIds(values: string[] | undefined, people: Person[], label: string) {
  if (!values?.length) return undefined;

  const resolved: string[] = [];
  for (const value of values) {
    const normalizedValue = normalize(value);
    const exact = people.filter(
      (person) => normalize(person.id) === normalizedValue || normalize(person.name) === normalizedValue
    );
    if (exact.length === 1) {
      resolved.push(exact[0].id);
      continue;
    }
    if (exact.length > 1) {
      throw new Error(`Multiple ${label} matched "${value}". Please be more specific.`);
    }

    const partial = people.filter((person) => normalize(person.name).includes(normalizedValue));
    if (partial.length === 1) {
      resolved.push(partial[0].id);
      continue;
    }
    if (partial.length > 1) {
      throw new Error(`Multiple ${label} matched "${value}". Please be more specific.`);
    }

    throw new Error(`No ${label} matched "${value}".`);
  }

  return resolved;
}

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

function buildTasksFilterHref(action: AssistantPlannedAction) {
  const params = new URLSearchParams();
  action.filters?.status?.forEach((value) => params.append('status', value));
  action.filters?.statusGroup?.forEach((value) => params.append('statusGroup', value));
  action.filters?.repo?.forEach((value) => params.append('repo', value));
  action.filters?.tags?.forEach((value) => params.append('tags', value));
  if (action.filters?.search) params.set('search', action.filters.search);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as Partial<T>;
}

function describeAction(action: AssistantPlannedAction) {
  if (action.type === 'create_task' || action.type === 'update_task' || action.type === 'set_task_reminder') {
    return [
      action.task?.title ? `Title: ${action.task.title}` : null,
      action.task?.status ? `Status: ${action.task.status}` : null,
      action.task?.repositories?.length ? `Repositories: ${action.task.repositories.join(', ')}` : null,
      action.task?.developers?.length ? `Developers: ${action.task.developers.join(', ')}` : null,
      action.task?.testers?.length ? `Testers: ${action.task.testers.join(', ')}` : null,
      action.task?.tags?.length ? `Tags: ${action.task.tags.join(', ')}` : null,
      action.task?.reminder ? `Reminder: ${action.task.reminder}` : null,
      action.task?.reminderExpiresAt ? `Reminder time: ${new Date(action.task.reminderExpiresAt).toLocaleString()}` : null,
      action.task?.customFields && Object.keys(action.task.customFields).length
        ? `Custom fields: ${Object.entries(action.task.customFields)
            .map(([key, value]) => `${key} = ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(' • ')}`
        : null,
      action.task?.description ? `Description: ${action.task.description}` : null,
    ].filter(Boolean) as string[];
  }

  if (action.type === 'create_note' || action.type === 'update_note') {
    return [
      action.note?.title ? `Title: ${action.note.title}` : null,
      action.note?.content ? `Content: ${action.note.content}` : null,
    ].filter(Boolean) as string[];
  }

  if (action.type === 'clear_task_reminder') {
    return action.targetQuery ? [`Task: ${action.targetQuery}`, 'Reminder will be cleared'] : ['Reminder will be cleared'];
  }

  if (action.type === 'navigate_filtered_tasks') {
    return [
      action.filters?.status?.length ? `Statuses: ${action.filters.status.join(', ')}` : null,
      action.filters?.statusGroup?.length ? `Status groups: ${action.filters.statusGroup.join(', ')}` : null,
      action.filters?.repo?.length ? `Repositories: ${action.filters.repo.join(', ')}` : null,
      action.filters?.tags?.length ? `Tags: ${action.filters.tags.join(', ')}` : null,
      action.filters?.search ? `Search: ${action.filters.search}` : null,
    ].filter(Boolean) as string[];
  }

  return action.targetQuery ? [`Target: ${action.targetQuery}`] : [];
}

function getAssistantActiveFields(uiConfig: UiConfig) {
  return uiConfig.fields
    .filter((field) => field.isActive)
    .sort((left, right) => left.order - right.order)
    .map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      isRequired: field.isRequired,
      isCustom: field.isCustom,
      options: field.options?.map((option) => option.label || option.value) || [],
    }));
}

function findAssistantFieldConfig(query: string, uiConfig: UiConfig) {
  const normalizedQuery = normalize(query);
  const sanitizedQuery = sanitizeEntityQuery(query);
  const activeFields = uiConfig.fields.filter((field) => field.isActive);

  const exact = activeFields.find((field) =>
    normalize(field.key) === normalizedQuery ||
    normalize(field.label) === normalizedQuery ||
    sanitizeEntityQuery(field.key) === sanitizedQuery ||
    sanitizeEntityQuery(field.label) === sanitizedQuery
  );
  if (exact) return exact;

  const ranked = activeFields
    .map((field) => ({
      field,
      score: getEntitySimilarityScore(query, `${field.label} ${field.key}`),
    }))
    .filter((candidate) => candidate.score > 170)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return null;
  if (ranked[1] && ranked[0].score === ranked[1].score) return null;
  return ranked[0].field;
}

function coerceAssistantFieldValue(value: unknown, field: FieldConfig): string | number | boolean | string[] | null {
  if (value === null || typeof value === 'undefined') return null;

  const optionValues = (field.options || []).map((option) => option.value || option.label);

  switch (field.type) {
    case 'checkbox': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (isTruthyString(value)) return true;
        if (isFalsyString(value)) return false;
      }
      throw new Error(`"${field.label}" expects a yes/no style value.`);
    }
    case 'number': {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
      }
      throw new Error(`"${field.label}" expects a numeric value.`);
    }
    case 'multiselect':
    case 'tags': {
      const values = Array.isArray(value)
        ? value.map((item) => String(item).trim()).filter(Boolean)
        : String(value).split(',').map((item) => item.trim()).filter(Boolean);

      if (field.type === 'multiselect' && optionValues.length) {
        const resolved = values.map((entry) => {
          const match = optionValues.find((option) => normalize(option) === normalize(entry));
          if (!match) {
            throw new Error(`"${entry}" is not a valid option for "${field.label}".`);
          }
          return match;
        });
        return resolved;
      }

      return values;
    }
    case 'select': {
      const stringValue = String(value).trim();
      if (!optionValues.length) return stringValue;
      const match = optionValues.find((option) => normalize(option) === normalize(stringValue));
      if (!match) {
        throw new Error(`"${stringValue}" is not a valid option for "${field.label}".`);
      }
      return match;
    }
    default:
      return String(value).trim();
  }
}

function resolveAssistantCustomFields(
  inputCustomFields: Record<string, string | number | boolean | string[] | null> | undefined,
  uiConfig: UiConfig,
  existingCustomFields: Record<string, unknown> = {}
) {
  if (!inputCustomFields || !Object.keys(inputCustomFields).length) return undefined;

  const resolved: Record<string, string | number | boolean | string[] | null> = {
    ...existingCustomFields as Record<string, string | number | boolean | string[] | null>,
  };

  for (const [rawFieldKey, rawValue] of Object.entries(inputCustomFields)) {
    const field = findAssistantFieldConfig(rawFieldKey, uiConfig);
    if (!field) {
      throw new Error(`I could not match the field "${rawFieldKey}" to an active workspace field.`);
    }
    if (!field.isCustom) {
      throw new Error(`"${field.label}" is a built-in field, so it should not be sent as a custom field update.`);
    }
    resolved[field.key] = coerceAssistantFieldValue(rawValue, field);
  }

  return resolved;
}

function getAssistantCapabilitiesMessage(role: 'guest' | 'user' | 'admin', authMode: 'localStorage' | 'authenticate') {
  const lines = [
    'Here is what I can do right now:',
    '',
    '1. Open tasks or templates by title, close match, or saved preset name.',
    '2. Navigate to pages like tasks, templates, notes, dashboard, reminders, logs, bin, profile, settings, and Excel import.',
    '3. Open filtered task views using status, status group, repository, tags, or search text.',
    '4. Create a new task from natural language.',
    '5. Update task fields, including active custom fields from your workspace settings.',
    '6. Set or clear task reminders.',
    '7. Create notes and update existing notes.',
    '8. Preview every write first, then wait for your confirmation before changing data.',
  ];

  if (authMode !== 'authenticate') {
    lines.push('', 'Some account-aware or protected workspace requests may ask you to sign in first.');
  }

  if (role !== 'admin') {
    lines.push('', 'Privacy rules apply: I do not expose other users, private roster data, or admin-only workspace details here.');
  }

  lines.push(
    '',
    'What I do not handle fully yet:',
    '- bulk actions through chat',
    '- imports/exports through chat',
    '- template creation or template editing through chat',
    '- autonomous destructive actions'
  );

  return lines.join('\n');
}

function evaluateAssistantAccessPolicy(message: string, options: {
  authMode: 'localStorage' | 'authenticate';
  role: 'guest' | 'user' | 'admin';
}): AssistantAccessPolicyResult {
  const normalizedMessage = normalize(message);

  const privacyPatterns = [
    'who all are using',
    'who is using',
    'list users',
    'show user data',
    'their data',
    'all user data',
    'user emails',
    'user email',
    'phone number',
    'team members',
    'developers list',
    'testers list',
    'workspace users',
    'who uses',
  ];

  const authPatterns = [
    'my account',
    'cloud sync',
    'sync across devices',
    'authenticate',
    'sign in',
    'login',
    'log in',
  ];

  const adminPatterns = [
    'admin',
    'all feedback',
    'all notifications',
    'workspace analytics',
    'usage analytics',
  ];

  if (privacyPatterns.some((pattern) => normalizedMessage.includes(pattern))) {
    if (options.authMode !== 'authenticate') {
      return {
        status: 'requires_auth',
        message: 'That kind of people or usage data is not available in guest mode. If you sign in, I can help with account-aware features, but private user and roster data still stays restricted here.',
        cta: {
          label: 'Authenticate',
          mode: 'auth',
        },
      };
    }

    return {
      status: 'restricted',
      message: 'I can’t expose other users, roster details, or private usage data through the assistant. I can still help with your visible tasks, notes, reminders, navigation, and field updates.',
    };
  }

  if (authPatterns.some((pattern) => normalizedMessage.includes(pattern)) && options.authMode !== 'authenticate') {
    return {
      status: 'requires_auth',
      message: 'This request needs an authenticated account. Sign in to unlock account-aware features and synced workspace access.',
      cta: {
        label: 'Authenticate',
        mode: 'auth',
      },
    };
  }

  if (adminPatterns.some((pattern) => normalizedMessage.includes(pattern)) && options.role !== 'admin') {
    if (options.authMode !== 'authenticate') {
      return {
        status: 'requires_auth',
        message: 'That area is protected. Sign in first, and keep in mind that admin-only features still stay hidden unless your account has admin access.',
        cta: {
          label: 'Authenticate',
          mode: 'auth',
        },
      };
    }

    return {
      status: 'restricted',
      message: 'That request is limited to admin access, so I can’t help with it from this account.',
    };
  }

  return { status: 'allowed' };
}

function evaluateAssistantActionAccess(action: AssistantPlannedAction, options: {
  authMode: 'localStorage' | 'authenticate';
  role: 'guest' | 'user' | 'admin';
}): AssistantAccessPolicyResult {
  const href = action.href || '';
  const target = `${action.label} ${action.explanation || ''} ${action.targetQuery || ''} ${href}`;

  if (href.startsWith('/admin') || normalize(target).includes('admin')) {
    if (options.authMode !== 'authenticate') {
      return {
        status: 'requires_auth',
        message: 'This action is protected. Sign in first, and admin-only features will still remain limited by your account role.',
        cta: { label: 'Authenticate', mode: 'auth' },
      };
    }
    if (options.role !== 'admin') {
      return {
        status: 'restricted',
        message: 'This action is limited to admin access, so I can’t execute it from this account.',
      };
    }
  }

  return { status: 'allowed' };
}

function isAssistantCancelIntent(value: string) {
  const normalizedValue = normalize(value);
  return [
    'stop',
    'cancel',
    'cancel it',
    'stop it',
    'never mind',
    'nevermind',
    'leave it',
    'forget it',
    'drop it',
    'quit',
    'close it',
  ].some((phrase) => normalizedValue === phrase || normalizedValue.includes(phrase));
}

function isMissingAssistantFieldValue(value: unknown, field: FieldConfig) {
  if (value === null || typeof value === 'undefined') return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (field.type === 'checkbox') return false;
  return false;
}

function getMissingRequiredAssistantTaskFields(task: Partial<Task>, uiConfig: UiConfig) {
  return uiConfig.fields
    .filter((field) => field.isActive && field.isRequired)
    .filter((field) => {
      const value = field.isCustom ? task.customFields?.[field.key] : (task as Record<string, unknown>)[field.key];
      return isMissingAssistantFieldValue(value, field);
    })
    .map((field) => field.label);
}

function buildAssistantTaskDraftPrompt(
  sourcePrompt: string,
  draft: NonNullable<AssistantPlannedAction['task']>,
  latestUserMessage: string
) {
  return [
    'We are continuing the same task creation request.',
    `Original request: ${sourcePrompt}`,
    `Current draft: ${JSON.stringify(draft)}`,
    `New user details: ${latestUserMessage}`,
    'Continue the create_task plan by preserving existing details, filling in new details, and asking for any still-missing required fields if needed.',
  ].join('\n');
}

function buildAssistantNoteDraftPrompt(
  sourcePrompt: string,
  draft: NonNullable<AssistantPlannedAction['note']>,
  latestUserMessage: string
) {
  return [
    'We are continuing the same note creation request.',
    `Original request: ${sourcePrompt}`,
    `Current draft: ${JSON.stringify(draft)}`,
    `New user details: ${latestUserMessage}`,
    'Continue the create_note plan by preserving existing details, filling in new details, and asking for any still-missing note title or content if both are still empty.',
  ].join('\n');
}

function parseAssistantNoteDetails(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let title: string | undefined;
  let content: string | undefined;

  for (const line of lines) {
    const match = line.match(/^(title|content)\s*[:\-]\s*(.+)$/i);
    if (!match) continue;
    const [, rawKey, rawValue] = match;
    const key = rawKey.toLowerCase();
    const value = rawValue.trim();
    if (!value) continue;
    if (key === 'title') title = value;
    if (key === 'content') content = value;
  }

  if (!title && !content && lines.length === 1) {
    content = lines[0];
  }

  return {
    title,
    content,
    hasStructuredDetails: Boolean(title || content),
  };
}

function sanitizeAssistantRuntimeErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('an error occurred in the server components render') ||
    normalized.includes('specific message is omitted in production builds') ||
    normalized.includes('digest property') ||
    normalized.includes('production builds to avoid leaking sensitive details')
  ) {
    return 'The assistant hit a protected server error while processing that request. Please try again. If it keeps happening, try a simpler prompt or continue with shorter details.';
  }

  return message;
}

function sanitizeAssistantVisibleMessage(message: string) {
  return sanitizeAssistantRuntimeErrorMessage(message);
}

function isGenericAssistantEntityRequest(value: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return true;

  const genericPhrases = new Set([
    'open',
    'show',
    'find',
    'go to',
    'task',
    'tasks',
    'note',
    'notes',
    'open task',
    'open tasks',
    'open note',
    'open notes',
    'show task',
    'show tasks',
    'show note',
    'show notes',
  ]);

  return genericPhrases.has(normalizedValue) || sanitizeEntityQuery(value).length < 2;
}

function isAssistantPlannerUnavailableMessage(message: string) {
  const normalized = normalize(message);
  return (
    normalized.includes('protected server error while processing that request') ||
    normalized.includes('ai is currently unavailable') ||
    normalized.includes('gemini api key') ||
    normalized.includes('configured gemini model is unavailable') ||
    normalized.includes('assistant unavailable')
  );
}

function buildLocalAssistantFallbackPlan(message: string): AssistantPlan | null {
  const normalizedMessage = normalize(message);
  const cleanedQuery = sanitizeEntityQuery(message);

  if (
    normalizedMessage.includes('dashboard') ||
    normalizedMessage.includes('templates') ||
    normalizedMessage.includes('reminders') ||
    normalizedMessage.includes('logs') ||
    normalizedMessage.includes('bin') ||
    normalizedMessage.includes('settings') ||
    normalizedMessage.includes('profile') ||
    normalizedMessage.includes('notes page') ||
    normalizedMessage.includes('notes workspace')
  ) {
    const navigationTargets: Array<{ match: string; href: string; label: string }> = [
      { match: 'dashboard', href: '/dashboard', label: 'Dashboard' },
      { match: 'templates', href: '/tasks/templates', label: 'Templates' },
      { match: 'reminders', href: '/reminders', label: 'Reminders' },
      { match: 'logs', href: '/logs', label: 'Logs' },
      { match: 'bin', href: '/bin', label: 'Bin' },
      { match: 'settings', href: '/settings', label: 'Settings' },
      { match: 'profile', href: '/profile', label: 'Profile' },
      { match: 'notes', href: '/notes', label: 'Notes workspace' },
    ];
    const target = navigationTargets.find((item) => normalizedMessage.includes(item.match));
    if (target) {
      return {
        message: `I can still open ${target.label.toLowerCase()} while the AI planner is unavailable.`,
        actions: [{ type: 'navigate', label: target.label, href: target.href }],
        needsConfirmation: false,
      };
    }
  }

  if (normalizedMessage.includes('open note') || normalizedMessage.includes('find note')) {
    if (!cleanedQuery) {
      return {
        message: 'Please tell me which note you want to open. You can say something like `Open release note` or `Open standup follow-ups`.',
        actions: [],
        needsConfirmation: false,
      };
    }
    return {
      message: 'I can still try to open that note from local matching.',
      actions: [{ type: 'open_note', label: 'Open note', targetQuery: cleanedQuery || message.trim() }],
      needsConfirmation: false,
    };
  }

  if (
    normalizedMessage.includes('open') ||
    normalizedMessage.includes('show') ||
    normalizedMessage.includes('find') ||
    normalizedMessage.includes('go to')
  ) {
    if (!cleanedQuery) {
      return {
        message: 'Please tell me what you want to open. You can say something like `Open March OT`, `Open OT Template`, or `Open release note`.',
        actions: [],
        needsConfirmation: false,
      };
    }
    if (cleanedQuery) {
      return {
        message: 'I can still try to open the closest matching task or template from local matching.',
        actions: [{ type: 'open_task', label: 'Open task', targetQuery: cleanedQuery }],
        needsConfirmation: false,
      };
    }
  }

  if (normalizedMessage.includes('create note') || normalizedMessage.includes('new note')) {
    return {
      message: 'The AI planner is unavailable right now, but I can still help you start a note. Please send at least a title or some content, like `Title - Release note` or `Content - Follow up with QA`.',
      actions: [],
      needsConfirmation: false,
    };
  }

  if (normalizedMessage.includes('create task') || normalizedMessage.includes('new task')) {
    return {
      message: 'The AI planner is unavailable right now, but I can still help you prepare a task once you share the title or more details.',
      actions: [],
      needsConfirmation: false,
    };
  }

  if (
    normalizedMessage.includes('what can you do') ||
    normalizedMessage.includes('help') ||
    normalizedMessage.includes('how to')
  ) {
    return {
      message: 'The AI planner is temporarily unavailable. I can still help with simple page navigation, opening matching tasks/templates/notes, and starting task or note drafts from clear prompts.',
      actions: [],
      needsConfirmation: false,
    };
  }

  return null;
}

function buildAssistantDirectIntentPlan(message: string): AssistantPlan | null {
  const normalizedMessage = normalize(message);
  const cleanedQuery = sanitizeEntityQuery(message);

  const navigationTargets: Array<{ match: string; href: string; label: string }> = [
    { match: 'dashboard', href: '/dashboard', label: 'Dashboard' },
    { match: 'templates', href: '/tasks/templates', label: 'Templates' },
    { match: 'reminders', href: '/reminders', label: 'Reminders' },
    { match: 'logs', href: '/logs', label: 'Logs' },
    { match: 'bin', href: '/bin', label: 'Bin' },
    { match: 'settings', href: '/settings', label: 'Settings' },
    { match: 'profile', href: '/profile', label: 'Profile' },
    { match: 'notes page', href: '/notes', label: 'Notes workspace' },
    { match: 'notes workspace', href: '/notes', label: 'Notes workspace' },
  ];

  const directPageTarget = navigationTargets.find((item) => normalizedMessage.includes(item.match));
  if (directPageTarget) {
    return {
      message: `Opening ${directPageTarget.label.toLowerCase()}.`,
      actions: [{ type: 'navigate', label: directPageTarget.label, href: directPageTarget.href }],
      needsConfirmation: false,
    };
  }

  if (
    normalizedMessage.includes('open note') ||
    normalizedMessage.includes('find note') ||
    normalizedMessage.includes('navigate to note')
  ) {
    return {
      message: cleanedQuery
        ? 'Looking for the closest matching note.'
        : 'Please tell me which note you want to open. You can say something like `Open release note` or `Open standup follow-ups`.',
      actions: cleanedQuery ? [{ type: 'open_note', label: 'Open note', targetQuery: cleanedQuery }] : [],
      needsConfirmation: false,
    };
  }

  if (
    normalizedMessage.includes('open') ||
    normalizedMessage.includes('show') ||
    normalizedMessage.includes('find') ||
    normalizedMessage.includes('go to') ||
    normalizedMessage.includes('navigate to') ||
    normalizedMessage.startsWith('navigate ')
  ) {
    return {
      message: cleanedQuery
        ? 'Looking for the closest matching task or template.'
        : 'Please tell me what you want to open. You can say something like `Open March OT`, `Navigate to IE 774`, or `Open OT Template`.',
      actions: cleanedQuery ? [{ type: 'open_task', label: 'Open task', targetQuery: cleanedQuery }] : [],
      needsConfirmation: false,
    };
  }

  return null;
}

function inferIntentFromPrompt(prompt: string): AssistantIntentSummary | null {
  const normalizedPrompt = normalize(prompt);

  if (normalizedPrompt.includes('reminder')) return { key: 'reminders', label: 'workspace and task reminders', count: 1 };
  if (normalizedPrompt.includes('note')) return { key: 'notes', label: 'notes and note edits', count: 1 };
  if (normalizedPrompt.includes('template')) return { key: 'templates', label: 'template lookups', count: 1 };
  if (normalizedPrompt.includes('status') || normalizedPrompt.includes('repo') || normalizedPrompt.includes('filter')) {
    return { key: 'filters', label: 'task filtering and status views', count: 1 };
  }
  if (normalizedPrompt.includes('create') || normalizedPrompt.includes('add')) return { key: 'creates', label: 'creating new work items', count: 1 };
  if (normalizedPrompt.includes('update') || normalizedPrompt.includes('edit') || normalizedPrompt.includes('change')) {
    return { key: 'updates', label: 'updating existing records', count: 1 };
  }
  if (normalizedPrompt.includes('open') || normalizedPrompt.includes('go to') || normalizedPrompt.includes('navigate')) {
    return { key: 'navigation', label: 'opening pages and records', count: 1 };
  }
  if (normalizedPrompt.includes('how') || normalizedPrompt.includes('steps') || normalizedPrompt.includes('explain')) {
    return { key: 'guidance', label: 'step-by-step guidance', count: 1 };
  }

  return null;
}

function buildAssistantPersonalizationSummary(sessions: AssistantChatSession[]) {
  const recentPrompts = sessions
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .flatMap((session) => session.messages)
    .filter((message) => message.role === 'user')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .slice(-24);

  if (!recentPrompts.length) {
    return 'No prior assistant usage is available yet for this user.';
  }

  const intentMap = new Map<string, AssistantIntentSummary>();
  const tokenMap = new Map<string, number>();

  for (const prompt of recentPrompts) {
    const intent = inferIntentFromPrompt(prompt);
    if (intent) {
      const existing = intentMap.get(intent.key);
      intentMap.set(intent.key, {
        ...intent,
        count: (existing?.count || 0) + 1,
      });
    }

    sanitizeEntityQuery(prompt)
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !ASSISTANT_MEMORY_STOP_WORDS.has(token))
      .forEach((token) => {
        tokenMap.set(token, (tokenMap.get(token) || 0) + 1);
      });
  }

  const topIntents = Array.from(intentMap.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 3)
    .map((intent) => `${intent.label} (${intent.count})`);

  const topTerms = Array.from(tokenMap.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([term]) => term);

  const latestPrompts = recentPrompts.slice(-3).map((prompt) => `"${prompt}"`);

  return [
    topIntents.length ? `Frequent request styles: ${topIntents.join(', ')}.` : null,
    topTerms.length ? `Recurring terms from this user: ${topTerms.join(', ')}.` : null,
    latestPrompts.length ? `Recent examples from this user: ${latestPrompts.join(' | ')}.` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildAssistantContext(
  pathname: string,
  sessions: AssistantChatSession[],
  userLabel: string,
  options: { authMode: 'localStorage' | 'authenticate'; role: 'guest' | 'user' | 'admin' }
) {
  const uiConfig = getUiConfig();
  const tasks = getTasks();
  const notes = getNotes();
  const personalizationSummary = buildAssistantPersonalizationSummary(sessions);
  const activeFields = getAssistantActiveFields(uiConfig);

  const recentTasks = tasks.slice(0, 18).map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    repositories: task.repositories || [],
    tags: task.tags || [],
    customFields: task.customFields || {},
    updatedAt: task.updatedAt,
  }));

  const recentNotes = notes.slice(0, 12).map((note) => ({
    id: note.id,
    title: note.title,
    updatedAt: note.updatedAt,
  }));

  return [
    `Current route: ${pathname}`,
    `App name: ${uiConfig.appName || 'TaskFlow'}`,
    `Current assistant user: ${userLabel}`,
    `Auth mode: ${options.authMode}`,
    `Assistant role: ${options.role}`,
    `Task count: ${tasks.length}`,
    `Note count: ${notes.length}`,
    `Statuses: ${uiConfig.taskStatuses.join(', ') || 'None'}`,
    `Repositories: ${uiConfig.repositoryConfigs.map((repository) => repository.name).join(', ') || 'None'}`,
    `Environments: ${(uiConfig.environments || []).map((environment) => environment.name).join(', ') || 'None'}`,
    `People data in planner context: restricted`,
    `Active workspace fields: ${JSON.stringify(activeFields)}`,
    'Access policy: Never expose other users, roster details, emails, phone numbers, usage analytics, or admin-only data to guests or non-admin users.',
    'If a request requires sign-in, explain that clearly and prefer a sign-in CTA instead of guessing.',
    `Personalization summary:\n${personalizationSummary}`,
    `Recent tasks: ${JSON.stringify(recentTasks)}`,
    `Recent notes: ${JSON.stringify(recentNotes)}`,
  ].join('\n');
}

function isCapabilitiesPrompt(value: string) {
  const normalizedValue = normalize(value);
  return (
    normalizedValue.includes('what can you do') ||
    normalizedValue.includes('what all can you do') ||
    normalizedValue.includes('show features') ||
    normalizedValue.includes('list features') ||
    normalizedValue.includes('help me with prompts') ||
    normalizedValue.includes('what prompts') ||
    normalizedValue.includes('assistant features') ||
    normalizedValue.includes('capabilities')
  );
}

function getFutureEnhancementMessage(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FUTURE_ENHANCEMENT_MESSAGES.length;
  return FUTURE_ENHANCEMENT_MESSAGES[index];
}

function shouldShowFutureEnhancementFollowUp(message: string) {
  const normalizedMessage = normalize(message);
  if (
    normalizedMessage.includes('private') ||
    normalizedMessage.includes('privacy') ||
    normalizedMessage.includes('protected') ||
    normalizedMessage.includes('restricted') ||
    normalizedMessage.includes('admin access') ||
    normalizedMessage.includes('sign in') ||
    normalizedMessage.includes('authenticate')
  ) {
    return false;
  }

  return (
    normalizedMessage.includes('not supported') ||
    normalizedMessage.includes('cannot') ||
    normalizedMessage.includes('can’t') ||
    normalizedMessage.includes('unable') ||
    normalizedMessage.includes('not available')
  );
}

function getSafetyResponse(value: string) {
  const normalizedValue = normalize(value);

  const illegalPatterns = [
    'hack',
    'hacking',
    'steal',
    'stolen',
    'bypass',
    'crack',
    'pirated',
    'piracy',
    'malware',
    'ransomware',
    'exploit',
    'weapon',
    'bomb',
    'fraud',
    'scam',
    'drugs',
    'kill',
    'murder',
  ];

  const explicitPatterns = [
    'porn',
    'nude',
    'sex',
    'sexy',
    'fetish',
    'nsfw',
  ];

  if (illegalPatterns.some((pattern) => normalizedValue.includes(pattern))) {
    return 'I can’t help with illegal, harmful, or abusive requests. If you want, I can still help with safe task management, notes, reminders, navigation, or product questions inside TaskFlow.';
  }

  if (explicitPatterns.some((pattern) => normalizedValue.includes(pattern))) {
    return 'I can’t help with explicit or inappropriate requests here. I can help with safe workspace actions, feature guidance, planning, notes, and reminders instead.';
  }

  return null;
}

function getGeneralConversationResponse(value: string) {
  const normalizedValue = normalize(value);

  if (
    normalizedValue === 'leave' ||
    normalizedValue === 'bye' ||
    normalizedValue === 'goodbye' ||
    normalizedValue === 'exit' ||
    normalizedValue === 'close' ||
    normalizedValue === 'done' ||
    normalizedValue === 'later' ||
    normalizedValue === 'talk later'
  ) {
    return 'Sure. I’ll stay here whenever you need help with TaskFlow again.';
  }

  if (/^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening)\b/.test(normalizedValue)) {
    return 'Hello. I’m here to help with TaskFlow tasks, notes, reminders, navigation, and feature questions. You can ask me to create something, update a field, or explain how a flow works.';
  }

  if (normalizedValue.includes('how are you')) {
    return 'I’m doing well and ready to help. If you want, tell me what you need in TaskFlow and I’ll guide you step by step or prepare the action for confirmation.';
  }

  if (
    normalizedValue === 'thanks' ||
    normalizedValue === 'thank you' ||
    normalizedValue === 'ok thanks' ||
    normalizedValue === 'great thanks'
  ) {
    return 'You’re welcome. I’m here whenever you want help with tasks, notes, reminders, navigation, or feature guidance.';
  }

  if (
    normalizedValue.includes('who are you') ||
    normalizedValue.includes('what are you') ||
    normalizedValue.includes('what do you do')
  ) {
    return 'I’m your TaskFlow desktop assistant. I can help you create and update tasks, manage notes and reminders, open pages or records, and explain how features work inside the app.';
  }

  if (
    normalizedValue.includes('tell me a joke') ||
    normalizedValue.includes('sing a song') ||
    normalizedValue.includes('write a poem') ||
    normalizedValue.includes('who is the president') ||
    normalizedValue.includes('weather') ||
    normalizedValue.includes('stock price')
  ) {
    return 'I’m staying focused on TaskFlow here. I can still help with workspace actions, explain product flows, guide you step by step, or prepare task, note, and reminder changes for confirmation.';
  }

  return null;
}

function getLocalHelpResponse(value: string) {
  const normalizedValue = normalize(value);

  if (
    normalizedValue.includes('how to create task') ||
    normalizedValue.includes('how do i create task') ||
    normalizedValue.includes('how to create tasks') ||
    normalizedValue.includes('how do i create tasks')
  ) {
    return [
      'Here are the steps to create a task:',
      '',
      '1. Open the `Tasks` page.',
      '2. Click `New Task`.',
      '3. Enter the task title and description.',
      '4. Choose the status, repositories, assignees, tags, and any other required fields.',
      '5. Add a reminder if needed.',
      '6. Save the task to create it.',
      '',
      'You can also ask me things like `Create a task for QA sign-off tomorrow` and I can prepare it for confirmation here.',
    ].join('\n');
  }

  return null;
}

function formatAssistantContent(value: string) {
  return value
    .replace(/:\s*(\d+\.)/g, ':\n\n$1')
    .replace(/(\d+\.)\s+/g, '\n$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPromptSuggestionCandidate(value: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue || normalizedValue.length < 6) return false;
  if (getSafetyResponse(normalizedValue) || getGeneralConversationResponse(normalizedValue)) return false;
  if (isCapabilitiesPrompt(normalizedValue) || getLocalHelpResponse(normalizedValue)) return false;
  return true;
}

function isAssistantErrorLikeMessage(value: string) {
  const normalizedValue = normalize(value);
  return (
    normalizedValue.includes('protected server error') ||
    normalizedValue.includes('assistant unavailable') ||
    normalizedValue.includes('ai unavailable') ||
    normalizedValue.includes('could not find') ||
    normalizedValue.includes('please be more specific') ||
    normalizedValue.includes('not supported') ||
    normalizedValue.includes('not available here') ||
    normalizedValue.includes('restricted') ||
    normalizedValue.includes('sign in') ||
    normalizedValue.includes('authenticate') ||
    normalizedValue.includes('something went wrong') ||
    normalizedValue.includes('failed') ||
    normalizedValue.includes('error')
  );
}

function getSuccessfulHistoryPrompts(sessions: AssistantChatSession[]) {
  const successfulPrompts: string[] = [];

  for (const session of sessions) {
    for (let index = 0; index < session.messages.length; index += 1) {
      const message = session.messages[index];
      if (message.role !== 'user') continue;

      const nextAssistantMessage = session.messages
        .slice(index + 1)
        .find((candidate) => candidate.role === 'assistant');

      const prompt = message.content.trim();
      if (!isPromptSuggestionCandidate(prompt)) continue;
      if (!nextAssistantMessage) continue;
      if (isAssistantErrorLikeMessage(nextAssistantMessage.content)) continue;

      successfulPrompts.push(prompt);
    }
  }

  return Array.from(new Set(successfulPrompts));
}

function shufflePromptSuggestions<T>(items: T[], seed: string) {
  const nextItems = [...items];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    hash = (hash * 1103515245 + 12345) | 0;
    const swapIndex = Math.abs(hash) % (index + 1);
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }
  return nextItems;
}

function getPromptSuggestionMatches(input: string, sessions: AssistantChatSession[]): PromptSuggestion[] {
  const normalizedInput = normalize(input);
  if (normalizedInput.length < 2) return [];

  const historyPrompts = getSuccessfulHistoryPrompts(sessions);
  const vettedPrompts = VETTED_ASSISTANT_PROMPTS.filter((prompt) => isPromptSuggestionCandidate(prompt));

  const pool = [
    ...historyPrompts.map((text) => ({ id: `history-${text}`, text, source: 'history' as const })),
    ...vettedPrompts.map((text) => ({ id: `suggested-${text}`, text, source: 'suggested' as const })),
  ];

  const scored = pool
    .map((item) => {
      const normalizedText = normalize(item.text);
      let score = 48;

      if (normalizedText === normalizedInput) score += 500;
      if (normalizedText.startsWith(normalizedInput)) score += 280;
      if (normalizedText.includes(normalizedInput)) score += 200;
      if (fuzzySearch(normalizedInput, normalizedText)) score += 120;

      const inputTokens = normalizedInput.split(/\s+/).filter(Boolean);
      const textTokens = new Set(normalizedText.split(/\s+/).filter(Boolean));
      score += inputTokens.reduce((sum, token) => sum + (textTokens.has(token) ? 45 : 0), 0);

      return { ...item, score };
    })
    .filter((item) => item.score > 125)
    .sort((left, right) => right.score - left.score || left.text.length - right.text.length);

  const strongestMatches = scored.filter((item) => item.score >= 260).slice(0, 6);
  const fallbackMatches = scored.filter((item) => item.score < 260).slice(0, 8);
  const selected = [
    ...shufflePromptSuggestions(strongestMatches, `${normalizedInput}-strong`).slice(0, 3),
    ...shufflePromptSuggestions(fallbackMatches, `${normalizedInput}-fallback`).slice(0, 2),
  ].slice(0, 4);

  return selected.map(({ id, text, source }) => ({ id, text, source }));
}

function getAssistantStarterPrompts(sessions: AssistantChatSession[], seed: string) {
  const historyPrompts = getSuccessfulHistoryPrompts(sessions).map((text) => ({
    id: `starter-history-${text}`,
    text,
    source: 'history' as const,
  }));
  const vettedPrompts = VETTED_ASSISTANT_PROMPTS.map((text) => ({
    id: `starter-vetted-${text}`,
    text,
    source: 'suggested' as const,
  }));

  const uniqueHistory = historyPrompts.slice(0, 8);
  const mixed = [
    ...shufflePromptSuggestions(uniqueHistory, `${seed}-history`).slice(0, 2),
    ...shufflePromptSuggestions(vettedPrompts, `${seed}-vetted`).slice(0, 4),
  ];

  const deduped = Array.from(
    new Map(mixed.map((item) => [normalize(item.text), item])).values()
  );

  return shufflePromptSuggestions(deduped, `${seed}-final`).slice(0, 4);
}

function AssistantThinkingBubble({ isExecuting }: { isExecuting: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-[28px] border border-primary/15 bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.94))] px-4 py-3 text-foreground shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.35)]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="h-4 w-4" />
            <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_60%)]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {isExecuting ? 'Applying your request' : 'Thinking through your request'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:180ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:360ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIAssistant() {
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
  const [pendingPlan, setPendingPlan] = React.useState<AssistantPlan | null>(null);
  const [availability, setAvailability] = React.useState<{ available: boolean; reason: string } | null>(null);
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
    async (action: AssistantPlannedAction) => {
      const actionAccess = evaluateAssistantActionAccess(action, {
        authMode,
        role: assistantRole,
      });
      if (actionAccess.status !== 'allowed') {
        setAssistantCta(actionAccess.cta || null);
        return { message: actionAccess.message || 'That action is not available here.' };
      }

      const tasks = getTasks();
      const notes = getNotes();
      const generalReminders = getGeneralReminders();
      const templates = getTaskTemplates();
      const nextUiConfig = getUiConfig();
      const developers = getDevelopers();
      const testers = getTesters();

      switch (action.type) {
        case 'answer':
          return { message: action.explanation || action.label };
        case 'navigate': {
          const href = action.href || '/';
          navigateWithLoader(href);
          setFollowUpHref(href);
          setFollowUpLabel('Open destination');
          return { message: `Opened ${action.label.toLowerCase()}.`, href };
        }
        case 'navigate_filtered_tasks': {
          const href = buildTasksFilterHref(action);
          navigateWithLoader(href);
          setFollowUpHref(href);
          setFollowUpLabel('Open filtered tasks');
          return { message: 'Opened the matching filtered task view.', href };
        }
        case 'open_task': {
          if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
            return { message: 'Please tell me which task or template you want to open. You can say something like `Open March OT` or `Open OT Template`.' };
          }
          const { task, matches } = findTaskMatch(action.targetQuery || '', tasks);
          if (task) {
            const href = `/tasks/${task.id}`;
            navigateWithLoader(href);
            setFollowUpHref(href);
            setFollowUpLabel(`Open ${task.title}`);
            return { message: `Opened ${task.title}.`, href };
          }

          const { template, matches: templateMatches } = findTemplateMatch(action.targetQuery || '', templates);
          if (template) {
            const href = `/tasks/templates/${template.id}/edit`;
            navigateWithLoader(href);
            setFollowUpHref(href);
            setFollowUpLabel(`Open ${template.name}`);
            return { message: `Opened template ${template.name}.`, href };
          }

          if (matches.length > 1 || templateMatches.length > 1) {
            return { message: `I found multiple matches for "${action.targetQuery}". Please tell me the exact task or template name you want.` };
          }
          return { message: `I could not find a task or template matching "${action.targetQuery}". Try the exact title or a more specific part of the name.` };
        }
        case 'open_note': {
          if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
            return { message: 'Please tell me which note you want to open. You can say something like `Open release note` or `Open standup follow-ups`.' };
          }
          const { note, matches } = findNoteMatch(action.targetQuery || '', notes);
          if (note) {
            const searchQuery = note.title?.trim() || action.targetQuery || '';
            const href = `/notes?q=${encodeURIComponent(searchQuery)}`;
            navigateWithLoader(href);
            setFollowUpHref(href);
            setFollowUpLabel(`Search ${note.title || 'note'} in notes`);
            return { message: `Opened notes and searched for "${note.title || searchQuery}".`, href };
          }
          const fallbackQuery = action.targetQuery || '';
          const href = `/notes?q=${encodeURIComponent(fallbackQuery)}`;
          navigateWithLoader(href);
          setFollowUpHref(href);
          setFollowUpLabel('Open notes search');
          if (matches.length > 1) {
            return { message: `I found multiple close notes for "${fallbackQuery}". I opened the notes page and searched for it so you can choose the right one.`, href };
          }
          return { message: `I opened the notes page and searched for "${fallbackQuery}".`, href };
        }
        case 'create_task': {
          const resolvedCustomFields = resolveAssistantCustomFields(action.task?.customFields, nextUiConfig);
          const taskDraft = omitUndefined({
            title: action.task?.title || 'Untitled Task',
            description: action.task?.description || '',
            status: resolveStatus(action.task?.status, nextUiConfig),
            repositories: resolveRepositories(action.task?.repositories, nextUiConfig),
            developers: resolveNamesToIds(action.task?.developers, developers, 'developers'),
            testers: resolveNamesToIds(action.task?.testers, testers, 'testers'),
            tags: action.task?.tags,
            reminder: action.task?.reminder ?? null,
            reminderExpiresAt: action.task?.reminderExpiresAt ?? null,
            customFields: resolvedCustomFields,
          });
          const uniqueness = checkUniqueness(taskDraft);
          if (!uniqueness.isUnique) {
            return { message: `A task with the same unique ${uniqueness.fieldLabel || 'field'} value "${uniqueness.value}" already exists. Please change that value and try again.` };
          }
          const createdTask = addTask(omitUndefined({
            ...taskDraft,
          }));
          const href = `/tasks/${createdTask.id}`;
          setFollowUpHref(href);
          setFollowUpLabel(`Open ${createdTask.title}`);
          return { message: `Created task "${createdTask.title}".`, href };
        }
        case 'update_task': {
          if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
            return { message: 'Please tell me which task you want to update, along with the field you want changed.' };
          }
          const { task, matches } = findTaskMatch(action.targetQuery || '', tasks);
          if (!task) {
            if (matches.length > 1) {
              return { message: `I found multiple tasks for "${action.targetQuery}". Please tell me the exact task title.` };
            }
            return { message: `I could not find a task matching "${action.targetQuery}". Try the exact task title or a more specific phrase.` };
          }

          const resolvedCustomFields = resolveAssistantCustomFields(
            action.task?.customFields,
            nextUiConfig,
            task.customFields || {}
          );
          const uniqueness = checkUniqueness(omitUndefined({
            ...task,
            title: action.task?.title ?? task.title,
            description: action.task?.description ?? task.description,
            status: action.task?.status ? resolveStatus(action.task.status, nextUiConfig) : task.status,
            repositories: action.task?.repositories ? resolveRepositories(action.task.repositories, nextUiConfig) : task.repositories,
            developers: action.task?.developers ? resolveNamesToIds(action.task.developers, developers, 'developers') : task.developers,
            testers: action.task?.testers ? resolveNamesToIds(action.task.testers, testers, 'testers') : task.testers,
            tags: action.task?.tags ?? task.tags,
            reminder: action.task?.reminder ?? task.reminder,
            reminderExpiresAt: action.task?.reminderExpiresAt ?? task.reminderExpiresAt,
            customFields: resolvedCustomFields,
          }), task.id);
          if (!uniqueness.isUnique) {
            return { message: `Another task already uses the unique ${uniqueness.fieldLabel || 'field'} value "${uniqueness.value}". Please change that value and try again.` };
          }

          const updatedTask = updateTask(task.id, omitUndefined({
            title: action.task?.title,
            description: action.task?.description,
            status: action.task?.status ? resolveStatus(action.task.status, nextUiConfig) : undefined,
            repositories: action.task?.repositories ? resolveRepositories(action.task.repositories, nextUiConfig) : undefined,
            developers: action.task?.developers ? resolveNamesToIds(action.task.developers, developers, 'developers') : undefined,
            testers: action.task?.testers ? resolveNamesToIds(action.task.testers, testers, 'testers') : undefined,
            tags: action.task?.tags,
            reminder: action.task?.reminder,
            reminderExpiresAt: action.task?.reminderExpiresAt,
            customFields: resolvedCustomFields,
          }));

          if (!updatedTask) {
            return { message: `I could not update "${task.title}".` };
          }

          const href = `/tasks/${updatedTask.id}`;
          setFollowUpHref(href);
          setFollowUpLabel(`Open ${updatedTask.title}`);
          return { message: `Updated ${updatedTask.title}.`, href };
        }
        case 'set_task_reminder': {
          if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
            return { message: 'Please tell me which task should get the reminder.' };
          }
          const { task, matches } = findTaskMatch(action.targetQuery || '', tasks);
          if (!task) {
            if (matches.length > 1) {
              return { message: `I found multiple tasks for "${action.targetQuery}". Please tell me the exact task title.` };
            }
            return { message: `I could not find a task matching "${action.targetQuery}". Try the exact task title or a more specific phrase.` };
          }
          const updatedTask = updateTask(task.id, {
            reminder: action.task?.reminder ?? task.reminder ?? 'Reminder',
            reminderExpiresAt: action.task?.reminderExpiresAt ?? task.reminderExpiresAt ?? null,
          });
          if (!updatedTask) {
            return { message: `I could not set the reminder for "${task.title}".` };
          }
          const href = `/tasks/${updatedTask.id}`;
          setFollowUpHref(href);
          setFollowUpLabel(`Open ${updatedTask.title}`);
          return { message: `Set a reminder for ${updatedTask.title}.`, href };
        }
        case 'clear_task_reminder': {
          if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
            return { message: 'Please tell me which task reminder you want to clear.' };
          }
          const { task, matches } = findTaskMatch(action.targetQuery || '', tasks);
          if (!task) {
            if (matches.length > 1) {
              return { message: `I found multiple tasks for "${action.targetQuery}". Please tell me the exact task title.` };
            }
            return { message: `I could not find a task matching "${action.targetQuery}". Try the exact task title or a more specific phrase.` };
          }
          const updatedTask = updateTask(task.id, {
            reminder: null,
            reminderExpiresAt: null,
          });
          if (!updatedTask) {
            return { message: `I could not clear the reminder for "${task.title}".` };
          }
          const href = `/tasks/${updatedTask.id}`;
          setFollowUpHref(href);
          setFollowUpLabel(`Open ${updatedTask.title}`);
          return { message: `Cleared the reminder for ${updatedTask.title}.`, href };
        }
        case 'create_note': {
          const createdNote = addNote(omitUndefined({
            title: action.note?.title || 'Untitled Note',
            content: action.note?.content || '',
          }));
          window.dispatchEvent(new Event('notes-updated'));
          setActiveNoteEditorNote(createdNote);
          setIsNoteEditorOpen(true);
          setFollowUpHref(null);
          setFollowUpLabel(null);
          return { message: `Created note "${createdNote.title || 'Untitled Note'}".` };
        }
        case 'create_general_reminder': {
          const reminderText = action.reminder?.text?.trim();
          if (!reminderText) {
            return { message: 'Please provide reminder text to create a workspace reminder.' };
          }
          addGeneralReminder(reminderText);
          const href = '/reminders';
          setFollowUpHref(href);
          setFollowUpLabel('Open reminders');
          return { message: `Created workspace reminder "${reminderText}".`, href };
        }
        case 'clear_general_reminder': {
          const query = normalize(action.targetQuery || action.reminder?.text || '');
          const matches = generalReminders.filter((reminder) => normalize(reminder.text).includes(query));
          if (!matches.length) {
            return { message: `I could not find a workspace reminder matching "${action.targetQuery || action.reminder?.text}".` };
          }
          if (matches.length > 1) {
            return { message: `I found multiple workspace reminders for "${action.targetQuery || action.reminder?.text}". Please be more specific.` };
          }
          deleteGeneralReminder(matches[0].id);
          const href = '/reminders';
          setFollowUpHref(href);
          setFollowUpLabel('Open reminders');
          return { message: `Cleared workspace reminder "${matches[0].text}".`, href };
        }
        case 'update_note': {
          if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
            return { message: 'Please tell me which note you want to update, and what you want changed.' };
          }
          const { note, matches } = findNoteMatch(action.targetQuery || '', notes);
          if (!note) {
            if (matches.length > 1) {
              return { message: `I found multiple notes for "${action.targetQuery}". Please tell me the exact note title.` };
            }
            return { message: `I could not find a note matching "${action.targetQuery}". Try the exact note title or a more specific phrase.` };
          }
          updateNote(note.id, omitUndefined({
            title: action.note?.title,
            content: action.note?.content,
          }));
          const currentNote = getNotes().find((candidate) => candidate.id === note.id) || note;
          window.dispatchEvent(new Event('notes-updated'));
          setActiveNoteEditorNote(currentNote);
          setIsNoteEditorOpen(true);
          setFollowUpHref(null);
          setFollowUpLabel(null);
          return { message: `Updated note "${currentNote.title || 'Untitled Note'}".` };
        }
        default:
          return { message: action.label };
      }
    },
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
            if (isRequestCanceled(requestId)) {
              return;
            }
            const result = await handleExecuteAction(action);
            if (result.message) executionMessages.push(result.message);
          }

          if (executionMessages.length) {
            pushAssistantMessage(executionMessages.join(' '));
          }
          finishTrackedRequest(requestId);
        } catch (error) {
          if (isRequestCanceled(requestId)) {
            return;
          }
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

        if (isRequestCanceled(requestId)) {
          return;
        }

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
          if (isRequestCanceled(requestId)) {
            return;
          }
          const result = await handleExecuteAction(action);
          if (result.message) executionMessages.push(result.message);
        }

        if (executionMessages.length) {
          pushAssistantMessage(executionMessages.join(' '));
        }
        finishTrackedRequest(requestId);
      } catch (error) {
        if (isRequestCanceled(requestId)) {
          return;
        }
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
                if (isRequestCanceled(requestId)) {
                  return;
                }
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
  }, [assistantRole, assistantUserLabel, authMode, availability, beginTrackedRequest, clearAssistantEphemeralState, finishTrackedRequest, handleExecuteAction, input, isBusy, isRequestCanceled, pathname, pendingNoteDraft, pendingTaskDraft, pushAssistantMessage, sessions, toast]);

  const handleConfirmPlan = React.useCallback(() => {
    if (!pendingPlan?.actions.length || isExecuting) return;
    const requestId = beginTrackedRequest();

    startExecuting(async () => {
      try {
        const executionMessages: string[] = [];
        for (const action of pendingPlan.actions) {
          if (isRequestCanceled(requestId)) {
            return;
          }
          const result = await handleExecuteAction(action);
          if (result.message) executionMessages.push(result.message);
        }

        if (isRequestCanceled(requestId)) {
          return;
        }
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
        if (isRequestCanceled(requestId)) {
          return;
        }
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

  if (!mounted || isMobile || !assistantEnabled || !activeSession) {
    return null;
  }

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <button
                id="floating-ai-assistant-trigger"
                type="button"
                className="fixed bottom-16 right-8 z-[120] hidden rounded-[30px] md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <span className="group relative flex h-[58px] w-[58px] items-center justify-center rounded-[26px] border border-primary/20 bg-[linear-gradient(145deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.88)_52%,hsl(228_92%_61%)_100%)] text-primary-foreground shadow-[0_26px_60px_-28px_hsl(var(--primary)/0.9)] ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_hsl(var(--primary)/0.95)] dark:ring-white/10">
                  <span className="absolute inset-[1px] rounded-[25px] bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.02)_42%,rgba(255,255,255,0.08))]" />
                  <span className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_54%)]" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/30 bg-background/95 px-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary shadow-lg dark:bg-background/90">
                    AI
                  </span>
                  <span className="absolute inset-0 rounded-[26px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="absolute inset-x-3 top-2 h-5 rounded-full bg-white/20 blur-xl" />
                  </span>
                  <Sparkles className="relative h-6 w-6" />
                  <span className="sr-only">Open AI assistant</span>
                </span>
              </button>
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
                onClick={() => setIsOpen(false)}
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
                availability?.available === false
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-primary/20 bg-primary/5 text-primary'
              )}
            >
              {availability?.available === false ? 'AI unavailable' : 'Desktop assistant'}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold">
              Writes require confirmation
            </Badge>
          </div>

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
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent>{isChatManagerCollapsed ? 'Show chats' : 'Hide chats'}</TooltipContent>
                </Tooltip>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-[11px] font-semibold shadow-none"
                  onClick={handleStartNewChat}
                  disabled={isBusy}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New chat
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={handleRefreshCurrentSession}
                      disabled={isBusy || isRefreshingSession}
                    >
                      <RefreshCcw className={cn('h-4 w-4', isRefreshingSession && 'animate-spin')} />
                      <span className="sr-only">Refresh current chat</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh current chat</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={handleClearCurrentChat}
                      disabled={isBusy}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear current chat</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear current chat</TooltipContent>
                </Tooltip>
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
                    .map((session) => (
                      (() => {
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
                              onClick={() => handleSwitchSession(session.id)}
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
                                          handleDeleteSession(session.id);
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
                      })()
                    ))}
                </div>
              </div>
            </div>
          </div>

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
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm [overflow-wrap:anywhere] whitespace-pre-wrap break-words',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border/60 bg-background/90 text-foreground'
                    )}
                  >
                    {message.role === 'assistant' ? sanitizeAssistantVisibleMessage(message.content) : message.content}
                  </div>
                </div>
              ))}

              {hasTrackedRequest && !pendingPlan ? <AssistantThinkingBubble isExecuting={isExecuting} /> : null}

              {pendingPlan && (
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
                    <Button type="button" variant="outline" className="rounded-full px-5" onClick={handleCancelPlan}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full px-5"
                      onClick={handleConfirmPlan}
                      disabled={isExecuting}
                    >
                      {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Confirm
                    </Button>
                  </div>
                </div>
              )}

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
                      onClick={() => {
                        navigateWithLoader(followUpHref);
                      }}
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
                      onClick={() => {
                        if (assistantCta.mode === 'auth') {
                          window.dispatchEvent(new Event('open-auth-modal'));
                          return;
                        }
                        if (assistantCta.href) {
                          navigateWithLoader(assistantCta.href);
                        }
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {assistantCta.label}
                    </Button>
                  </div>
                </div>
              ) : null}

              {!isBusy && starterPrompts.length ? <div className="rounded-[28px] border border-border/60 bg-background/80 p-4">
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
                      onClick={() => setInput(prompt.text)}
                    >
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div> : null}
            </div>
          </ScrollArea>

          <Separator />

          <div className="space-y-3 px-5 py-4">
            {availability?.available === false ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-xs leading-5 text-destructive [overflow-wrap:anywhere] whitespace-pre-wrap break-words">
                {sanitizeAssistantVisibleMessage(availability.reason)}
              </div>
            ) : null}
            {showPromptSuggestions ? (
              <div className="overflow-hidden rounded-[24px] border border-border/60 bg-background/95 p-2 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.22)] transition-all duration-200 ease-out animate-in fade-in-0 slide-in-from-bottom-1 dark:shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between gap-3 px-2 pb-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Suggested prompts
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setDismissedSuggestionDraft(normalizedInput)}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Close suggestions</span>
                  </Button>
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                  {isSuggestionsLoading && !displayPromptSuggestions.length ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`suggestion-skeleton-${index}`}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-border/40 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-[78%] rounded-full" />
                          <Skeleton className="h-3.5 w-[54%] rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                      </div>
                    ))
                  ) : (
                    displayPromptSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-transparent bg-transparent px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/15 hover:bg-[linear-gradient(180deg,hsl(var(--primary)/0.08),hsl(var(--primary)/0.04))] hover:shadow-[0_14px_26px_-24px_hsl(var(--primary)/0.65)]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setInput(suggestion.text);
                          setIsInputFocused(true);
                        }}
                      >
                        <span className="min-w-0 text-sm leading-5 text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
                          {suggestion.text}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold transition-colors',
                            suggestion.source === 'history'
                              ? 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                              : 'bg-primary/8 text-primary group-hover:bg-primary/14'
                          )}
                        >
                          {suggestion.source === 'history' ? 'History' : 'Suggested'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {isSuggestionsLoading && displayPromptSuggestions.length ? (
                  <div className="px-2 pt-2">
                    <div className="flex items-center gap-2 rounded-2xl bg-muted/35 px-3 py-2 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Refreshing suggestions...
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-[28px] border border-border/60 bg-background/95 p-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.2)] dark:shadow-[0_16px_36px_-32px_rgba(0,0,0,0.48)]">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={isBusy}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder="Ask anything about TaskFlow..."
                    className="max-h-44 min-h-[40px] border-0 bg-transparent px-1 py-1.5 pr-1 text-sm leading-6 shadow-none focus-visible:ring-0 overflow-y-auto"
                    autoGrow
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end">
                  {hasTrackedRequest ? (
                    <Popover open={isStopConfirmOpen} onOpenChange={setIsStopConfirmOpen}>
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
                            <Button type="button" variant="ghost" className="rounded-full px-4" onClick={() => setIsStopConfirmOpen(false)}>
                              Keep running
                            </Button>
                            <Button type="button" className="rounded-full bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90" onClick={handleStopCurrentRequest}>
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
                    onClick={handleSubmit}
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
                onClick={() => {
                  navigateWithLoader('/settings?section=features#settings-features-card');
                }}
              >
                Manage in settings
                <ChevronsRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <NoteEditorDialog
        isOpen={isNoteEditorOpen}
        onOpenChange={(open) => {
          setIsNoteEditorOpen(open);
          if (!open) {
            setActiveNoteEditorNote(null);
          }
        }}
        note={activeNoteEditorNote}
        onSave={handleSaveAssistantNote}
      />
    </TooltipProvider>
  );
}
