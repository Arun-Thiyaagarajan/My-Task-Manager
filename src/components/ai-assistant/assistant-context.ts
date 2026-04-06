'use client';

import type { AssistantPlan, AssistantPlannedAction } from '@/lib/ai-assistant';
import {
  getNotes,
  getTasks,
  getUiConfig,
} from '@/lib/data';
import type { FieldConfig, Task, UiConfig } from '@/lib/types';
import type {
  AssistantChatSession,
  AssistantIntentSummary,
} from './assistant-types';
import {
  ASSISTANT_MEMORY_STOP_WORDS,
  buildTasksFilterHref,
  findBestEntityMatch,
  getEntitySimilarityScore,
  normalize,
  omitUndefined,
  sanitizeEntityQuery,
} from './assistant-utils';

export function getAssistantActiveFields(uiConfig: UiConfig) {
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

export function findAssistantFieldConfig(query: string, uiConfig: UiConfig) {
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

function isTruthyString(value: string) {
  return ['true', 'yes', 'on', 'checked', '1'].includes(normalize(value));
}

function isFalsyString(value: string) {
  return ['false', 'no', 'off', 'unchecked', '0'].includes(normalize(value));
}

export function coerceAssistantFieldValue(value: unknown, field: FieldConfig): string | number | boolean | string[] | null {
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

export function resolveAssistantCustomFields(
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

export function isMissingAssistantFieldValue(value: unknown, field: FieldConfig) {
  if (value === null || typeof value === 'undefined') return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (field.type === 'checkbox') return false;
  return false;
}

export function getMissingRequiredAssistantTaskFields(task: Partial<Task>, uiConfig: UiConfig) {
  return uiConfig.fields
    .filter((field) => field.isActive && field.isRequired)
    .filter((field) => {
      const value = field.isCustom ? task.customFields?.[field.key] : (task as Record<string, unknown>)[field.key];
      return isMissingAssistantFieldValue(value, field);
    })
    .map((field) => field.label);
}

export function buildAssistantTaskDraftPrompt(
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

export function buildAssistantNoteDraftPrompt(
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

export function parseAssistantNoteDetails(input: string) {
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

export function buildLocalAssistantFallbackPlan(message: string): AssistantPlan | null {
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
    return {
      message: 'I can still try to open the closest matching task or template from local matching.',
      actions: [{ type: 'open_task', label: 'Open task', targetQuery: cleanedQuery }],
      needsConfirmation: false,
    };
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

export function buildAssistantDirectIntentPlan(message: string): AssistantPlan | null {
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

export function inferIntentFromPrompt(prompt: string): AssistantIntentSummary | null {
  const normalizedPrompt = normalize(prompt);

  if (normalizedPrompt.includes('reminder')) return { key: 'reminders', label: 'workspace and task reminders', count: 1 };
  if (normalizedPrompt.includes('note')) return { key: 'notes', label: 'notes and note edits', count: 1 };
  if (normalizedPrompt.includes('template')) return { key: 'templates', label: 'template lookups', count: 1 };
  if (normalizedPrompt.includes('status') || normalizedPrompt.includes('repo') || normalizedPrompt.includes('filter')) {
    return { key: 'filters', label: 'task filtering and status views', count: 1 };
  }
  if (normalizedPrompt.includes('create') || normalizedPrompt.includes('add')) {
    return { key: 'creates', label: 'creating new work items', count: 1 };
  }
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

export function buildAssistantPersonalizationSummary(sessions: AssistantChatSession[]) {
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

export function buildAssistantContext(
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
    'People data in planner context: restricted',
    `Active workspace fields: ${JSON.stringify(activeFields)}`,
    'Access policy: Never expose other users, roster details, emails, phone numbers, usage analytics, or admin-only data to guests or non-admin users.',
    'If a request requires sign-in, explain that clearly and prefer a sign-in CTA instead of guessing.',
    `Personalization summary:\n${personalizationSummary}`,
    `Recent tasks: ${JSON.stringify(recentTasks)}`,
    `Recent notes: ${JSON.stringify(recentNotes)}`,
  ].join('\n');
}

