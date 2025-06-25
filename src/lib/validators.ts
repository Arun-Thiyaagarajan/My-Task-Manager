
import { z } from 'zod';
import { TASK_STATUSES, ENVIRONMENTS } from './constants';
import type { AdminConfig, FormFieldConfig, FormField } from './types';

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.'),
  url: z.string().url('Please provide a valid URL.'),
  type: z.enum(['link', 'file'], { errorMap: () => ({ message: 'Please select a type.' })}),
});

const getFieldSchema = (fieldId: string, config: FormFieldConfig, allFields: Record<string, FormField>) => {
    const fieldDef = allFields[fieldId];
    if (!fieldDef) return null;

    let schema: z.ZodTypeAny;

    switch(fieldDef.type) {
        case 'text':
        case 'textarea': {
            let baseSchema = z.string();

            if (fieldId === 'azureWorkItemId') {
                baseSchema = baseSchema.regex(/^\d*$/, { message: "Please enter a valid work item ID." });
            }

            if (config.required) {
                schema = baseSchema.min(fieldId === 'title' ? 3 : 1, { message: `${fieldDef.label} is required.` });
            } else {
                 schema = baseSchema.optional().or(z.literal(''));
            }
            break;
        }
        case 'select':
            schema = z.string();
            if(config.required) {
                schema = schema.min(1, { message: `${fieldDef.label} is required.`});
            } else {
                schema = schema.optional();
            }
            break;
        case 'multiselect':
        case 'tags':
            schema = z.array(z.string());
             if (config.required) {
                schema = schema.min(1, { message: `Please select at least one ${fieldDef.label.toLowerCase()}.` });
            } else {
                schema = schema.optional();
            }
            break;
        case 'date':
            schema = z.coerce.date().optional().nullable();
            if (config.required) {
                schema = schema.refine(val => val != null, { message: `${fieldDef.label} is required.`});
            }
            break;
        default:
            schema = z.any();
    }
    
    return schema;
}

export const buildTaskSchema = (adminConfig: AdminConfig, allFields: Record<string, FormField>) => {
    let schemaObject = {} as Record<string, z.ZodTypeAny>;

    // Add all fields to the schema initially, but many will be optional
    for (const fieldId in allFields) {
        const fieldConfig = adminConfig.fieldConfig[fieldId] || { visible: true, required: false };
        const fieldSchema = getFieldSchema(fieldId, fieldConfig, allFields);
        if (fieldSchema) {
            // If the field isn't required by config, make it optional
            // unless it's the title field which is always required.
            if (!fieldConfig.required && fieldId !== 'title') {
                schemaObject[fieldId] = fieldSchema.optional();
            } else {
                schemaObject[fieldId] = fieldSchema;
            }
        }
    }
    
    // Ensure title is always present and a string
    schemaObject.title = z.string().min(3, { message: 'Title is required and must be at least 3 characters.' });
    

    // Special case for fields that might not be in the layout but are needed for validation logic
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
