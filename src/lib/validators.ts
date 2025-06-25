
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
  
  deploymentStatus: z.object({
    dev: z.boolean().optional(),
    stage: z.boolean().optional(),
    production: z.boolean().optional(),
    others: z.boolean().optional(),
  }).optional(),
  othersEnvironmentName: z.string().optional(),
  deploymentDates: z.object({
    dev: z.coerce.date().optional().nullable(),
    stage: z.coerce.date().optional().nullable(),
    production: z.coerce.date().optional().nullable(),
    others: z.coerce.date().optional().nullable(),
  }).optional(),
  
  prLinks: z.object({
      dev: prLinkSchema.optional(),
      stage: prLinkSchema.optional(),
      production: prLinkSchema.optional(),
      others: prLinkSchema.optional(),
  }).optional(),

  attachments: z.array(attachmentSchema).optional(),
  
  devStartDate: z.coerce.date().optional().nullable(),
  devEndDate: z.coerce.date().optional().nullable(),
  qaStartDate: z.coerce.date().optional().nullable(),
  qaEndDate: z.coerce.date().optional().nullable(),

}).refine(
  (data) => {
    if (data.deploymentStatus?.others && !data.othersEnvironmentName?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide a name for the "others" environment when selected.',
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
).refine(
    (data) => !(data.deploymentStatus?.dev && !data.deploymentDates?.dev),
    { message: 'Dev deployment date is required.', path: ['deploymentDates.dev'] }
).refine(
    (data) => !(data.deploymentStatus?.stage && !data.deploymentDates?.stage),
    { message: 'Stage deployment date is required.', path: ['deploymentDates.stage'] }
).refine(
    (data) => !(data.deploymentStatus?.production && !data.deploymentDates?.production),
    { message: 'Production deployment date is required.', path: ['deploymentDates.production'] }
).refine(
    (data) => !(data.deploymentStatus?.others && !data.deploymentDates?.others),
    { message: 'Others deployment date is required.', path: ['deploymentDates.others'] }
);
