
import { z } from 'zod';
import { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';
import type { AdminConfig } from './types';
import { MASTER_FORM_FIELDS } from './form-config';

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.'),
  url: z.string().url('Please provide a valid URL.'),
  type: z.enum(['link', 'file'], { errorMap: () => ({ message: 'Please select a type.' })}),
});

const getFieldSchema = (fieldId: string, config: FormFieldConfig) => {
    const fieldDef = MASTER_FORM_FIELDS[fieldId];
    if (!fieldDef) return null;

    let schema: z.ZodTypeAny;

    switch(fieldDef.type) {
        case 'text':
        case 'textarea':
            schema = z.string();
            if (config.required) {
                schema = schema.min(fieldId === 'title' ? 3 : 1, { message: `${fieldDef.label} is required.` });
            } else {
                 schema = schema.optional().or(z.literal(''));
            }
             if (fieldId === 'azureWorkItemId') {
                schema = schema.regex(/^\d*$/, { message: "Please enter a valid work item ID." });
            }
            break;
        case 'select':
            schema = z.enum(fieldDef.options as [string, ...string[]]);
            break; // Status is always required by default in the schema
        case 'multiselect':
            schema = z.array(z.string());
             if (config.required) {
                schema = schema.min(1, { message: `Please select at least one ${fieldDef.label.toLowerCase()}.` });
            } else {
                schema = schema.optional();
            }
            break;
        case 'date':
            schema = z.date().optional();
            break;
        case 'attachments':
            schema = z.array(attachmentSchema).optional();
            break;
        case 'deployment':
            const deploymentStatusSchema = z.object(
                Object.fromEntries(
                    ENVIRONMENTS.map(env => [env, z.boolean().optional()])
                )
            );
            schema = deploymentStatusSchema.optional();
            break;
        case 'pr-links':
            const prLinksSchema = z.object(
                Object.fromEntries(
                    ENVIRONMENTS.map(env => [
                    env,
                    z.record(z.string(), z.string().optional()).optional(),
                    ])
                )
            );
            schema = prLinksSchema.optional();
            break;
        default:
            schema = z.any();
    }
    
    return schema;
}

export const buildTaskSchema = (adminConfig: AdminConfig) => {
    let schemaObject = {} as Record<string, z.ZodTypeAny>;

    adminConfig.formLayout.forEach(fieldId => {
        const fieldConfig = adminConfig.fieldConfig[fieldId];
        if (fieldConfig.visible) {
            const fieldSchema = getFieldSchema(fieldId, fieldConfig);
            if (fieldSchema) {
                 schemaObject[fieldId] = fieldSchema;
            }
        }
    });

    // Special case for othersEnvironmentName
     if (adminConfig.fieldConfig.deploymentStatus?.visible) {
         schemaObject.othersEnvironmentName = z.string().optional();
     }

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
