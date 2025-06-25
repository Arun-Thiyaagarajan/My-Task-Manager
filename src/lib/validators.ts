
import { z } from 'zod';
import type { AdminConfig, FormField } from './types';

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.'),
  url: z.string().url('Please provide a valid URL.'),
  type: z.enum(['link', 'file'], { errorMap: () => ({ message: 'Please select a type.' })}),
});

const getBaseFieldSchema = (fieldDef: FormField) => {
    if (!fieldDef) return null;

    switch(fieldDef.type) {
        case 'text':
        case 'textarea': {
            let baseSchema = z.string();
            if (fieldDef.id === 'azureWorkItemId') {
                baseSchema = baseSchema.regex(/^\d*$/, { message: "Please enter a valid work item ID." });
            }
            return baseSchema;
        }
        case 'select':
            return z.string();
        case 'multiselect':
        case 'tags':
            return z.array(z.string());
        case 'date':
            return z.coerce.date();
        default:
            return z.any();
    }
}


export const buildTaskSchema = (adminConfig: AdminConfig, allFields: Record<string, FormField>) => {
    // Build a set of all field IDs that are children in a conditional logic relationship.
    const conditionalChildrenIds = new Set<string>();
    Object.values(allFields).forEach(field => {
        if (field.conditionalLogic) {
            Object.values(field.conditionalLogic).forEach(childIds => {
                childIds.forEach(id => conditionalChildrenIds.add(id));
            });
        }
    });
    
    let schemaObject = {} as Record<string, z.ZodTypeAny>;

    for (const fieldId in allFields) {
        const fieldDef = allFields[fieldId];
        if (!fieldDef) continue;
        
        const fieldConfig = adminConfig.fieldConfig[fieldId] || { visible: false, required: false };
        let baseSchema = getBaseFieldSchema(fieldDef);
        if (!baseSchema) continue;

        const isConditional = conditionalChildrenIds.has(fieldId);
        // Conditional fields are always optional, regardless of their "required" toggle.
        const isRequired = fieldConfig.required && !isConditional; 

        if (isRequired) {
            if (fieldDef.type === 'text' || fieldDef.type === 'textarea') {
                baseSchema = baseSchema.min(1, { message: `${fieldDef.label} is required.` });
            } else if (fieldDef.type === 'select') {
                baseSchema = baseSchema.min(1, { message: `${fieldDef.label} is required.`});
            } else if (fieldDef.type === 'multiselect' || fieldDef.type === 'tags') {
                baseSchema = baseSchema.min(1, { message: `Please select at least one ${fieldDef.label.toLowerCase()}.` });
            } else if (fieldDef.type === 'date') {
                // The .refine check handles both null and undefined.
                baseSchema = baseSchema.refine(val => val != null, { message: `${fieldDef.label} is required.`});
            }
            schemaObject[fieldId] = baseSchema;
        } else {
            // Optional fields
            if (fieldDef.type === 'text' || fieldDef.type === 'textarea') {
                schemaObject[fieldId] = baseSchema.optional().or(z.literal(''));
            } else if (fieldDef.type === 'date') {
                schemaObject[fieldId] = baseSchema.optional().nullable();
            } else {
                schemaObject[fieldId] = baseSchema.optional();
            }
        }
    }
    
    // Ensure title is always present and a string, overriding any other logic.
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
