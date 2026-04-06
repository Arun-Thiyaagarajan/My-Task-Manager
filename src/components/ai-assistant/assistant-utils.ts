'use client';

import type { AssistantMessage, AssistantPlannedAction } from '@/lib/ai-assistant';
import type { Note, Person, Task, TaskTemplate } from '@/lib/types';
import { fuzzySearch } from '@/lib/utils';
import type { AssistantChatSession } from './assistant-types';

export const ASSISTANT_CHAT_STORAGE_KEY = 'taskflow_ai_assistant_sessions';
export const ASSISTANT_ACTIVE_CHAT_KEY = 'taskflow_ai_assistant_active_session';
export const ASSISTANT_CHAT_MANAGER_COLLAPSED_KEY = 'taskflow_ai_assistant_chat_manager_collapsed';
export const ASSISTANT_CHAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const ASSISTANT_MEMORY_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'about', 'what', 'when',
  'where', 'which', 'there', 'their', 'them', 'then', 'have', 'will', 'would', 'should', 'could',
  'please', 'taskflow', 'task', 'tasks', 'note', 'notes', 'page', 'pages', 'open', 'show', 'create',
  'update', 'help',
]);

export const ENTITY_NOISE_WORDS = new Set([
  'can', 'could', 'would', 'will', 'you', 'me', 'my', 'please', 'kindly', 'just', 'task', 'tasks',
  'template', 'templates', 'note', 'notes', 'page', 'open', 'show', 'find', 'navigate', 'go', 'goto',
  'to', 'the', 'a', 'an', 'edit', 'details', 'view',
]);

export const createMessage = (role: 'user' | 'assistant', content: string): AssistantMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
});

export const createInitialAssistantMessage = () =>
  createMessage(
    'assistant',
    'Ask me to open tasks, filter work, create notes, update task fields, explain features, or set reminders. I will preview every write before doing it.'
  );

export const createChatSession = (title = 'New chat'): AssistantChatSession => {
  const timestamp = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [createInitialAssistantMessage()],
  };
};

export function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

export function getSessionTitleFromMessages(messages: AssistantMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content?.trim();
  if (!firstUserMessage) return 'New chat';

  const cleaned = firstUserMessage
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(can you|could you|please|help me|i want to|show me|tell me|how do i|how to)\s+/i, '')
    .replace(/[?.!]+$/g, '')
    .trim();

  const compact = cleaned.split(' ').slice(0, 6).join(' ').trim();
  if (!compact) return 'New chat';
  const titled = compact.charAt(0).toUpperCase() + compact.slice(1);
  return titled.length > 38 ? `${titled.slice(0, 37)}…` : titled;
}

export function hasAssistantSessionUserPrompts(session: AssistantChatSession) {
  return session.messages.some((message) => message.role === 'user' && message.content.trim().length > 0);
}

export function getAssistantStorageKey(baseKey: string, scopeKey: string) {
  return `${baseKey}:${scopeKey}`;
}

export function loadAssistantSessions(scopeKey: string) {
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

export function isTruthyString(value: string) {
  return ['true', 'yes', 'on', 'checked', '1'].includes(normalize(value));
}

export function isFalsyString(value: string) {
  return ['false', 'no', 'off', 'unchecked', '0'].includes(normalize(value));
}

export function getAssistantUserScope(options: {
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

export function getAssistantUserLabel(options: {
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

export function getAssistantRole(authMode: 'localStorage' | 'authenticate', role?: string | null) {
  if (authMode !== 'authenticate') return 'guest';
  return role === 'admin' ? 'admin' : 'user';
}

export function sanitizeEntityQuery(value: string | null | undefined) {
  return normalize(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !ENTITY_NOISE_WORDS.has(token))
    .join(' ')
    .trim();
}

export function levenshteinDistance(source: string, target: string) {
  if (source === target) return 0;
  if (!source) return target.length;
  if (!target) return source.length;
  const matrix = Array.from({ length: source.length + 1 }, () => new Array<number>(target.length + 1).fill(0));
  for (let i = 0; i <= source.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= target.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[source.length][target.length];
}

export function getEntitySimilarityScore(query: string, label: string, extraText = '') {
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
  if (queryTokens.length > 0) score += (tokenHits / queryTokens.length) * 260;
  const distanceBase = cleanedQuery || normalizedQuery;
  const distanceTarget = cleanedLabel || normalizedLabel;
  if (distanceBase && distanceTarget) {
    const distance = levenshteinDistance(distanceBase, distanceTarget);
    const similarity = 1 - distance / Math.max(distanceBase.length, distanceTarget.length, 1);
    if (similarity > 0) score += similarity * 240;
  }
  return score;
}

export function findBestEntityMatch<T>(
  query: string,
  items: T[],
  options: { getPrimaryText: (item: T) => string; getSecondaryText?: (item: T) => string }
) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return { item: null as T | null, matches: [] as T[] };
  const ranked = items
    .map((item) => ({
      item,
      score: getEntitySimilarityScore(query, options.getPrimaryText(item), options.getSecondaryText?.(item) || ''),
    }))
    .filter((entry) => entry.score >= 220)
    .sort((left, right) => right.score - left.score);
  if (!ranked.length) return { item: null as T | null, matches: [] as T[] };
  if (ranked.length === 1) return { item: ranked[0].item, matches: [ranked[0].item] };
  const [first, second] = ranked;
  if (first.score - second.score >= 35) return { item: first.item, matches: ranked.map((entry) => entry.item) };
  return { item: null as T | null, matches: ranked.map((entry) => entry.item) };
}

export function findTaskMatch(query: string, tasks: Task[]) {
  const { item, matches } = findBestEntityMatch(query, tasks, {
    getPrimaryText: (task) => task.title,
    getSecondaryText: (task) => task.description || '',
  });
  return { task: item, matches };
}

export function findNoteMatch(query: string, notes: Note[]) {
  const { item, matches } = findBestEntityMatch(query, notes, {
    getPrimaryText: (note) => note.title || 'Untitled Note',
    getSecondaryText: (note) => note.content || '',
  });
  return { note: item, matches };
}

export function findTemplateMatch(query: string, templates: TaskTemplate[]) {
  const { item, matches } = findBestEntityMatch(query, templates, {
    getPrimaryText: (template) => template.name,
    getSecondaryText: (template) => template.description || '',
  });
  return { template: item, matches };
}

export function resolveNamesToIds(values: string[] | undefined, people: Person[], label: string) {
  if (!values?.length) return undefined;
  const resolved: string[] = [];
  for (const value of values) {
    const normalizedValue = normalize(value);
    const exact = people.filter((person) => normalize(person.id) === normalizedValue || normalize(person.name) === normalizedValue);
    if (exact.length === 1) {
      resolved.push(exact[0].id);
      continue;
    }
    if (exact.length > 1) throw new Error(`Multiple ${label} matched "${value}". Please be more specific.`);
    const partial = people.filter((person) => normalize(person.name).includes(normalizedValue));
    if (partial.length === 1) {
      resolved.push(partial[0].id);
      continue;
    }
    if (partial.length > 1) throw new Error(`Multiple ${label} matched "${value}". Please be more specific.`);
    throw new Error(`No ${label} matched "${value}".`);
  }
  return resolved;
}

export function buildTasksFilterHref(action: AssistantPlannedAction) {
  const params = new URLSearchParams();
  action.filters?.status?.forEach((value) => params.append('status', value));
  action.filters?.statusGroup?.forEach((value) => params.append('statusGroup', value));
  action.filters?.repo?.forEach((value) => params.append('repo', value));
  action.filters?.tags?.forEach((value) => params.append('tags', value));
  if (action.filters?.search) params.set('search', action.filters.search);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as Partial<T>;
}

export function describeAction(action: AssistantPlannedAction) {
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
        ? `Custom fields: ${Object.entries(action.task.customFields).map(([key, value]) => `${key} = ${Array.isArray(value) ? value.join(', ') : value}`).join(' • ')}`
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
