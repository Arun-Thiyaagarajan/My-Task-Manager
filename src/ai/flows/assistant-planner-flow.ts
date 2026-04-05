'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { DEFAULT_GEMINI_MODEL, ensureAiAvailable, getAiAvailabilityState, getAiErrorMessage } from '@/ai/availability';

const TaskPayloadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  repositories: z.array(z.string()).optional(),
  developers: z.array(z.string()).optional(),
  testers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  reminder: z.string().nullable().optional(),
  reminderExpiresAt: z.string().nullable().optional(),
  customFields: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])).optional(),
});

const NotePayloadSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});

const ReminderPayloadSchema = z.object({
  text: z.string().optional(),
});

const FilterSchema = z.object({
  status: z.array(z.string()).optional(),
  statusGroup: z.array(z.string()).optional(),
  repo: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

const AssistantActionSchema = z.object({
  type: z.enum([
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
  ]),
  label: z.string(),
  explanation: z.string().optional(),
  targetQuery: z.string().optional(),
  href: z.string().optional(),
  filters: FilterSchema.optional(),
  task: TaskPayloadSchema.optional(),
  note: NotePayloadSchema.optional(),
  reminder: ReminderPayloadSchema.optional(),
});

const AssistantPlannerInputSchema = z.object({
  message: z.string().min(1),
  context: z.string().min(1),
});

const AssistantPlannerOutputSchema = z.object({
  message: z.string(),
  actions: z.array(AssistantActionSchema).max(4).default([]),
  needsConfirmation: z.boolean().default(false),
});

export type AssistantPlannerInput = z.infer<typeof AssistantPlannerInputSchema>;
export type AssistantPlannerOutput = z.infer<typeof AssistantPlannerOutputSchema>;

export async function getAiAssistantAvailability() {
  return getAiAvailabilityState();
}

export async function planAssistantAction(
  input: AssistantPlannerInput
): Promise<AssistantPlannerOutput> {
  try {
    ensureAiAvailable();
    return await assistantPlannerFlow(input);
  } catch (error) {
    throw new Error(getAiErrorMessage(error));
  }
}

const assistantPlannerFlow = ai.defineFlow(
  {
    name: 'assistantPlannerFlow',
    inputSchema: AssistantPlannerInputSchema,
    outputSchema: AssistantPlannerOutputSchema,
  },
  async ({ message, context }) => {
    const { output } = await ai.generate({
      model: DEFAULT_GEMINI_MODEL,
      config: {
        temperature: 0.25,
      },
      output: {
        schema: AssistantPlannerOutputSchema,
      },
      prompt: `You are the desktop AI assistant inside TaskFlow.

Turn the user's request into a concise response plus a structured action plan.

Rules:
- Only use the allowed action types.
- Prefer answering directly when no app action is needed.
- If the user is asking a question, explanation, FAQ, or "how do I..." prompt, answer clearly in plain language instead of forcing an action.
- When the user asks for steps, return a step-by-step answer in the message with short numbered guidance.
- Use "navigate" for static pages like "/", "/dashboard", "/notes", "/tasks/templates", "/reminders", "/logs", "/bin", "/settings", "/profile", "/tasks/import/excel".
- Use "navigate_filtered_tasks" when the user wants tasks filtered by status, status group, repository, tags, or search text.
- Use "open_task" when the user wants a specific task opened by title or id.
- Use "open_note" when the user wants a specific note opened by title or id.
- For "open_task", extract the shortest likely entity name from the request.
- Ignore filler words like "open", "task", "template", "page", "show", and tolerate minor spelling mistakes in the user's phrasing.
- Use "create_task" for new tasks.
- Use "update_task" for changing existing task fields. Put the identifying task title or id into targetQuery.
- For active custom fields, place updates in task.customFields using the field label or key as the object key.
- Respect active field types and configured options from the provided workspace context when filling custom fields.
- Use "create_note" and "update_note" for notes.
- Use "create_general_reminder" and "clear_general_reminder" for workspace reminders shown in reminders/home.
- Use "set_task_reminder" and "clear_task_reminder" only for task reminders. Put the identifying task title or id into targetQuery.
- Never invent ids. Use names or titles in targetQuery.
- If the request is ambiguous, explain what needs clarification in message and return no actions.
- Set needsConfirmation to true if any action changes data. Keep it false for pure reads or navigation.
- Keep message practical and user-facing. For FAQ-style help, be clear and structured.
- Use the personalization summary when it helps disambiguate wording, preferred style, or recurring entities for this specific user, but never invent facts that are not supported by the provided context.
- Follow the access and privacy rules in the workspace context strictly. If something is restricted, explain the restriction and return no actions.

Available workspace context:
${context}

User request:
${message}`,
    });

    return output!;
  }
);
