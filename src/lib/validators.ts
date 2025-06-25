import { z } from 'zod';
import { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';

const prLinksSchema = z.object(
  Object.fromEntries(
    ENVIRONMENTS.map(env => [env, z.string().optional()])
  )
) as z.ZodType<Record<typeof ENVIRONMENTS[number], string | undefined>>;

const deploymentStatusSchema = z.object(
  Object.fromEntries(
    ENVIRONMENTS.map(env => [env, z.boolean().optional()])
  )
) as z.ZodType<Record<typeof ENVIRONMENTS[number], boolean | undefined>>;

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.'),
  url: z.string().url('Please provide a valid URL.'),
  type: z.enum(['link', 'file'], { errorMap: () => ({ message: 'Please select a type.' })}),
});


export const taskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }),
  notes: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid status.' }),
  }),
  repositories: z.array(z.enum(REPOSITORIES)).min(1, { message: 'Please select at least one repository.' }),
  azureWorkItemId: z.string().regex(/^\d*$/, { message: "Please enter a valid work item ID." }).optional().or(z.literal('')),
  developers: z.array(z.string()).optional(),
  qaIssueIds: z.string().optional(),
  prLinks: prLinksSchema,
  deploymentStatus: deploymentStatusSchema,
  othersEnvironmentName: z.string().optional(),
  devStartDate: z.date().optional(),
  devEndDate: z.date().optional(),
  qaStartDate: z.date().optional(),
  qaEndDate: z.date().optional(),
  stageDate: z.date().optional(),
  productionDate: z.date().optional(),
  othersDate: z.date().optional(),
}).refine(
  (data) => {
    if (data.deploymentStatus.others && !data.othersEnvironmentName?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide a name for the "others" environment.',
    path: ['othersEnvironmentName'],
  }
);
