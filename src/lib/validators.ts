
import { z } from 'zod';
import type { AdminConfig, FormField } from './types';

// Helper function to create a Zod schema for a single field definition
const createFieldSchema = (fieldDef: FormField, isRequired: boolean): z.ZodTypeAny | null => {
  if (!fieldDef) return null;

  let baseSchema: z.ZodTypeAny;

  switch(fieldDef.type) {
    case 'text':
    case 'textarea':
      baseSchema = z.string();
      if (fieldDef.id === 'azureWorkItemId') {
          baseSchema = baseSchema.regex(/^\d*$/, { message: "Please enter a valid work item ID." });
      }
      break;
    case 'select':
      baseSchema = z.string();
      break;
    case 'multiselect':
    case 'tags':
      baseSchema = z.array(z.string());
      break;
    case 'date':
      baseSchema = z.coerce.date();
      break;
    default:
      return z.any();
  }

  if (isRequired) {
    if (fieldDef.type === 'text' || fieldDef.type === 'textarea' || fieldDef.type === 'select') {
      return baseSchema.min(1, { message: `${fieldDef.label} is required.` });
    }
    if (fieldDef.type === 'multiselect' || fieldDef.type === 'tags') {
      return (baseSchema as z.ZodArray<any, any>).min(1, { message: `Please select at least one ${fieldDef.label.toLowerCase()}.` });
    }
    if (fieldDef.type === 'date') {
        return baseSchema.refine(val => val != null, { message: `${fieldDef.label} is required.`});
    }
    return baseSchema;
  } else {
    // Optional fields
     if (fieldDef.type === 'text' || fieldDef.type === 'textarea') {
         return baseSchema.optional().or(z.literal(''));
     }
    if (fieldDef.type === 'date') {
        return baseSchema.optional().nullable();
    }
    return baseSchema.optional();
  }
};

export const buildTaskSchema = (adminConfig: AdminConfig, allFields: Record<string, FormField>) => {
  const schemaObject = adminConfig.formLayout.reduce((acc, fieldId) => {
    const fieldDef = allFields[fieldId];
    if (fieldDef) {
      const isRequired = adminConfig.fieldConfig[fieldId]?.required || false;
      const fieldSchema = createFieldSchema(fieldDef, isRequired);
      if (fieldSchema) {
        acc[fieldId] = fieldSchema;
      }
    }
    return acc;
  }, {} as Record<string, z.ZodTypeAny>);
  
  if (!schemaObject.title) {
     schemaObject.title = z.string().min(3, { message: 'Title is required and must be at least 3 characters.' });
  }

  if (adminConfig.fieldConfig.deploymentStatus?.visible && !schemaObject.othersEnvironmentName) {
         schemaObject.othersEnvironmentName = z.string().optional();
  }
  if (!schemaObject.devStartDate) schemaObject.devStartDate = z.coerce.date().optional().nullable();
  if (!schemaObject.devEndDate) schemaObject.devEndDate = z.coerce.date().optional().nullable();
  if (!schemaObject.qaStartDate) schemaObject.qaStartDate = z.coerce.date().optional().nullable();
  if (!schemaObject.qaEndDate) schemaObject.qaEndDate = z.coerce.date().optional().nullable();
  
  let dynamicSchema = z.object(schemaObject);

  // Add refinements
  dynamicSchema = dynamicSchema.refine(
    (data) => {
      if (data.deploymentStatus?.others && !data.othersEnvironmentName?.trim()) {
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

  return dynamicSchema;
};
