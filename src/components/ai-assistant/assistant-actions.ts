'use client';

import {
  addGeneralReminder,
  addNote,
  addTask,
  checkUniqueness,
  deleteGeneralReminder,
  getDevelopers,
  getGeneralReminders,
  getNotes,
  getTaskTemplates,
  getTasks,
  getTesters,
  getUiConfig,
  updateNote,
  updateTask,
} from '@/lib/data';
import type { AssistantPlannedAction } from '@/lib/ai-assistant';
import type { Note, Person, Task, UiConfig } from '@/lib/types';
import {
  type AssistantAccessPolicyResult,
} from './assistant-types';
import {
  evaluateAssistantActionAccess,
  isGenericAssistantEntityRequest,
} from './assistant-policy';
import {
  buildTasksFilterHref,
  findNoteMatch,
  findTaskMatch,
  findTemplateMatch,
  normalize,
  omitUndefined,
  resolveNamesToIds,
} from './assistant-utils';
import { resolveAssistantCustomFields } from './assistant-context';

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

export async function executeAssistantAction(
  action: AssistantPlannedAction,
  options: {
    authMode: 'localStorage' | 'authenticate';
    role: 'guest' | 'user' | 'admin';
    navigateWithLoader: (href: string) => void;
    setFollowUpHref: (href: string | null) => void;
    setFollowUpLabel: (label: string | null) => void;
    setAssistantCta: (cta: AssistantAccessPolicyResult['cta'] | null) => void;
    setActiveNoteEditorNote: (note: Partial<Note> | null) => void;
    setIsNoteEditorOpen: (open: boolean) => void;
  }
) {
  const actionAccess = evaluateAssistantActionAccess(action, {
    authMode: options.authMode,
    role: options.role,
  });

  if (actionAccess.status !== 'allowed') {
    options.setAssistantCta(actionAccess.cta || null);
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
      options.navigateWithLoader(href);
      options.setFollowUpHref(href);
      options.setFollowUpLabel('Open destination');
      return { message: `Opened ${action.label.toLowerCase()}.`, href };
    }
    case 'navigate_filtered_tasks': {
      const href = buildTasksFilterHref(action);
      options.navigateWithLoader(href);
      options.setFollowUpHref(href);
      options.setFollowUpLabel('Open filtered tasks');
      return { message: 'Opened the matching filtered task view.', href };
    }
    case 'open_task': {
      if (isGenericAssistantEntityRequest(action.targetQuery || '')) {
        return { message: 'Please tell me which task or template you want to open. You can say something like `Open March OT` or `Open OT Template`.' };
      }
      const { task, matches } = findTaskMatch(action.targetQuery || '', tasks);
      if (task) {
        const href = `/tasks/${task.id}`;
        options.navigateWithLoader(href);
        options.setFollowUpHref(href);
        options.setFollowUpLabel(`Open ${task.title}`);
        return { message: `Opened ${task.title}.`, href };
      }

      const { template, matches: templateMatches } = findTemplateMatch(action.targetQuery || '', templates);
      if (template) {
        const href = `/tasks/templates/${template.id}/edit`;
        options.navigateWithLoader(href);
        options.setFollowUpHref(href);
        options.setFollowUpLabel(`Open ${template.name}`);
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
        options.navigateWithLoader(href);
        options.setFollowUpHref(href);
        options.setFollowUpLabel(`Search ${note.title || 'note'} in notes`);
        return { message: `Opened notes and searched for "${note.title || searchQuery}".`, href };
      }
      const fallbackQuery = action.targetQuery || '';
      const href = `/notes?q=${encodeURIComponent(fallbackQuery)}`;
      options.navigateWithLoader(href);
      options.setFollowUpHref(href);
      options.setFollowUpLabel('Open notes search');
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
        developers: resolveNamesToIds(action.task?.developers, developers as Person[], 'developers'),
        testers: resolveNamesToIds(action.task?.testers, testers as Person[], 'testers'),
        tags: action.task?.tags,
        reminder: action.task?.reminder ?? null,
        reminderExpiresAt: action.task?.reminderExpiresAt ?? null,
        customFields: resolvedCustomFields,
      });
      const uniqueness = checkUniqueness(taskDraft);
      if (!uniqueness.isUnique) {
        return { message: `A task with the same unique ${uniqueness.fieldLabel || 'field'} value "${uniqueness.value}" already exists. Please change that value and try again.` };
      }
      const createdTask = addTask(omitUndefined({ ...taskDraft }));
      const href = `/tasks/${createdTask.id}`;
      options.navigateWithLoader(href);
      options.setFollowUpHref(href);
      options.setFollowUpLabel(`Open ${createdTask.title}`);
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
        developers: action.task?.developers ? resolveNamesToIds(action.task.developers, developers as Person[], 'developers') : task.developers,
        testers: action.task?.testers ? resolveNamesToIds(action.task.testers, testers as Person[], 'testers') : task.testers,
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
        developers: action.task?.developers ? resolveNamesToIds(action.task.developers, developers as Person[], 'developers') : undefined,
        testers: action.task?.testers ? resolveNamesToIds(action.task.testers, testers as Person[], 'testers') : undefined,
        tags: action.task?.tags,
        reminder: action.task?.reminder,
        reminderExpiresAt: action.task?.reminderExpiresAt,
        customFields: resolvedCustomFields,
      }));

      if (!updatedTask) {
        return { message: `I could not update "${task.title}".` };
      }

      const href = `/tasks/${updatedTask.id}`;
      options.setFollowUpHref(href);
      options.setFollowUpLabel(`Open ${updatedTask.title}`);
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
      options.setFollowUpHref(href);
      options.setFollowUpLabel(`Open ${updatedTask.title}`);
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
      options.setFollowUpHref(href);
      options.setFollowUpLabel(`Open ${updatedTask.title}`);
      return { message: `Cleared the reminder for ${updatedTask.title}.`, href };
    }
    case 'create_note': {
      const createdNote = addNote(omitUndefined({
        title: action.note?.title || 'Untitled Note',
        content: action.note?.content || '',
      }));
      window.dispatchEvent(new Event('notes-updated'));
      const searchQuery = createdNote.title?.trim() || 'Untitled Note';
      const href = `/notes?q=${encodeURIComponent(searchQuery)}`;
      options.navigateWithLoader(href);
      options.setFollowUpHref(href);
      options.setFollowUpLabel(`Search ${searchQuery} in notes`);
      return { message: `Created note "${searchQuery}".`, href };
    }
    case 'create_general_reminder': {
      const reminderText = action.reminder?.text?.trim();
      if (!reminderText) {
        return { message: 'Please provide reminder text to create a workspace reminder.' };
      }
      addGeneralReminder(reminderText);
      const href = '/reminders';
      options.setFollowUpHref(href);
      options.setFollowUpLabel('Open reminders');
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
      options.setFollowUpHref(href);
      options.setFollowUpLabel('Open reminders');
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
      options.setActiveNoteEditorNote(currentNote);
      options.setIsNoteEditorOpen(true);
      options.setFollowUpHref(null);
      options.setFollowUpLabel(null);
      return { message: `Updated note "${currentNote.title || 'Untitled Note'}".` };
    }
    default:
      return { message: action.label };
  }
}
