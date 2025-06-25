
import { z } from 'zod';
import { TASK_STATUSES } from './constants';

export const prLinkSchema = z.record(z.string().optional());
export const environmentPrLinksSchema = z.record(prLinkSchema.optional());

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.'),
  url: z.string().url('Please enter a valid URL.'),
  type: z.enum(['link', 'file']),
});

export const taskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
  status: z.enum(TASK_STATUSES),
  repositories: z.array(z.string()).optional(),
  developers: z.array(z.string()).optional(),
  azureWorkItemId: z.string().regex(/^\d*$/, { message: "Please enter a valid work item ID." }).optional().or(z.literal('')),
  
  deploymentStatus: z.record(z.string(), z.boolean().optional()).optional(),
  deploymentDates: z.record(z.string(), z.coerce.date().optional().nullable()).optional(),
  
  prLinks: z.record(z.string(), prLinkSchema.optional()).optional(),

  attachments: z.array(attachmentSchema).optional(),
  
  devStartDate: z.coerce.date().optional().nullable(),
  devEndDate: z.coerce.date().optional().nullable(),
  qaStartDate: z.coerce.date().optional().nullable(),
  qaEndDate: z.coerce.date().optional().nullable(),

}).refine(
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
).refine(
    (data) => {
      if (!data.deploymentStatus || !data.deploymentDates) return true;
      
      const deployedWithoutDate = Object.keys(data.deploymentStatus).find(env => 
          env !== 'dev' &&
          data.deploymentStatus?.[env] === true &&
          !data.deploymentDates?.[env]
      );
      
      return !deployedWithoutDate;
    },
    { 
        message: 'Each deployed environment (except dev) must have a deployment date.',
        path: ['deploymentDates'],
    }
);
