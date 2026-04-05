export const ASSISTANT_ACTION_TYPES = [
  'answer',
  'navigate',
  'navigate_filtered_tasks',
  'open_task',
  'open_note',
  'create_task',
  'update_task',
  'create_note',
  'update_note',
  'create_general_reminder',
  'clear_general_reminder',
  'set_task_reminder',
  'clear_task_reminder',
] as const;

export type AssistantActionType = (typeof ASSISTANT_ACTION_TYPES)[number];

export type AssistantTaskPayload = {
  title?: string;
  description?: string;
  status?: string;
  repositories?: string[];
  developers?: string[];
  testers?: string[];
  tags?: string[];
  reminder?: string | null;
  reminderExpiresAt?: string | null;
  customFields?: Record<string, string | number | boolean | string[] | null>;
};

export type AssistantNotePayload = {
  title?: string;
  content?: string;
};

export type AssistantReminderPayload = {
  text?: string;
};

export type AssistantTaskFilters = {
  status?: string[];
  statusGroup?: string[];
  repo?: string[];
  tags?: string[];
  search?: string;
};

export interface AssistantPlannedAction {
  type: AssistantActionType;
  label: string;
  explanation?: string;
  targetQuery?: string;
  href?: string;
  filters?: AssistantTaskFilters;
  task?: AssistantTaskPayload;
  note?: AssistantNotePayload;
  reminder?: AssistantReminderPayload;
}

export interface AssistantPlan {
  message: string;
  actions: AssistantPlannedAction[];
  needsConfirmation: boolean;
}

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function isAssistantMutationAction(type: AssistantActionType) {
  return (
    type === 'create_task' ||
    type === 'update_task' ||
    type === 'create_general_reminder' ||
    type === 'clear_general_reminder' ||
    type === 'create_note' ||
    type === 'update_note' ||
    type === 'set_task_reminder' ||
    type === 'clear_task_reminder'
  );
}
