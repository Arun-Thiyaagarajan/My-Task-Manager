import { z } from 'zod';
import { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';

const prLinksSchema = z.object(
  Object.fromEntries(
    ENVIRONMENTS.map(env => [
      env,
      z.record(z.string(), z.string().optional()).optional(),
    ])
  )
);

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
  attachments: z.array(attachmentSchema).optional(),
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid status.' }),
  }),
  repositories: z.array(z.enum(REPOSITORIES)).min(1, { message: 'Please select at least one repository.' }),
  azureWorkItemId: z.string().regex(/^\d*$/, { message: "Please enter a valid work item ID." }).optional().or(z.literal('')),
  developers: z.array(z.string()).optional(),
  qaIssueIds: z.string().optional(),
  prLinks: prLinksSchema.optional(),
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
).refine(
  (data) => {
    if (data.devStartDate && data.devEndDate) {
      return data.devEndDate >= data.devStartDate;
    }
    return true;
  },
  {
    message: "Development end date must be on or after the start date.",
    path: ["devEndDate"],
  }
).refine(
    (data) => {
    if (data.qaStartDate && data.qaEndDate) {
      return data.qaEndDate >= data.qaStartDate;
    }
    return true;
  },
  {
    message: 'QA end date must be on or after the start date.',
    path: ['qaEndDate'],
  }
);
