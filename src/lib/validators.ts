import { z } from 'zod';
import { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';

const prLinksSchema = z.object(
  Object.fromEntries(
    ENVIRONMENTS.map(env => [env, z.string().optional()])
  )
) as z.ZodType<Record<typeof ENVIRONMENTS[number], string | undefined>>;


export const taskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }),
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid status.' }),
  }),
  repositories: z.array(z.enum(REPOSITORIES)).min(1, { message: 'Please select at least one repository.' }),
  azureWorkItemId: z.string().regex(/^\d*$/, { message: "Please enter a valid work item ID." }).optional().or(z.literal('')),
  developers: z.array(z.string()).optional(),
  prLinks: prLinksSchema,
  devStartDate: z.date().optional(),
  devEndDate: z.date().optional(),
  qaStartDate: z.date().optional(),
  qaEndDate: z.date().optional(),
});
