
import { z } from 'zod';
import { TASK_STATUSES } from './constants';
import type { UiConfig } from './types';

export const prLinkSchema = z.record(z.string().optional());
export const environmentPrLinksSchema = z.record(prLinkSchema.optional());

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.'),
  url: z.string().min(1, "URL or image data is required."),
  type: z.enum(['link', 'image']),
}).refine(data => {
    if (data.type === 'link') {
        try {
            const url = new URL(data.url)
            return url.protocol === 'http:' || url.protocol === 'https:'
        } catch (_) {
            return false
        }
    }
    return true;
}, {
    message: 'Please enter a valid URL for links.',
    path: ['url'],
});

export const commentSchema = z.object({
  text: z.string(),
  timestamp: z.string().datetime(),
});

export const createTaskSchema = (uiConfig: UiConfig) => {
  let schema = z.object({
    id: z.string().optional(),
    createdAt: z.string().datetime({ message: "Invalid datetime string." }).optional(),
    updatedAt: z.string().datetime({ message: "Invalid datetime string." }).optional(),
    deletedAt: z.string().datetime({ message: "Invalid datetime string." }).optional().nullable(),
    comments: z.array(commentSchema).optional(),
    summary: z.string().nullable().optional(),
    isFavorite: z.boolean().optional(),
    reminder: z.string().nullable().optional(),
    reminderExpiresAt: z.coerce.date().optional().nullable(),
    
    // Default fields that are always present
    title: z.string().min(3, { message: "Title must be at least 3 characters." }),
    description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
    status: z.string().min(1, 'Status is required.'),
    repositories: z.array(z.string()).optional(),
    developers: z.array(z.string()).optional(),
    testers: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    azureWorkItemId: z.string().regex(/^\d*$/, { message: "Please enter a valid work item ID." }).optional().or(z.literal('')),
    
    deploymentStatus: z.record(z.string(), z.boolean().optional()).optional(),
    deploymentDates: z.record(z.string(), z.coerce.date().optional().nullable()).optional(),
    
    prLinks: z.record(z.string(), prLinkSchema.optional()).optional(),

    attachments: z.array(attachmentSchema).optional(),
    
    devStartDate: z.coerce.date().optional().nullable(),
    devEndDate: z.coerce.date().optional().nullable(),
    qaStartDate: z.coerce.date().optional().nullable(),
    qaEndDate: z.coerce.date().optional().nullable(),

    customFields: z.record(z.any()).optional(),
  });

  // Dynamically add required validations based on uiConfig
  uiConfig.fields.forEach(field => {
    if (field.isActive && field.isRequired) {
      const fieldName = field.isCustom ? `customFields.${field.key}` : field.key;
      
      // We need to access the schema definition to add refinements
      if (fieldName in schema.shape) {
        const shape = schema.shape as any;
        let fieldSchema = shape[fieldName];

        if (fieldSchema) {
          if (field.key === 'deploymentStatus') {
              fieldSchema = fieldSchema.refine((val: Record<string, boolean | undefined> | undefined) => {
                  return val !== undefined && Object.values(val).some(v => v === true);
              }, {
                  message: `${field.label} is required.`,
              });
          } else if (field.type === 'multiselect' || field.type === 'tags') {
              // For arrays, check if they are not empty
              fieldSchema = fieldSchema.refine((val: string[] | undefined) => val !== undefined && val.length > 0, {
                  message: `${field.label} is required.`,
              });
          } else if (field.type === 'text' || field.type === 'textarea') {
              // For strings, check if they are not empty
               fieldSchema = fieldSchema.refine((val: string | undefined) => typeof val === 'string' && val.trim().length > 0, {
                  message: `${field.label} is required.`,
              });
          } else {
              // For other types, just check for presence
              fieldSchema = fieldSchema.refine((val: any) => val !== undefined && val !== null && val !== '', {
                  message: `${field.label} is required.`,
              });
          }
          shape[fieldName] = fieldSchema;
        }
      }
    }
  });


  return schema.refine(
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
};

export const noteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});

// A default schema for use where uiConfig is not available.
// This one won't have dynamic required fields.
export const taskSchema = createTaskSchema({
  fields: [],
  environments: [],
  repositoryConfigs: [],
  taskStatuses: [],
});

    