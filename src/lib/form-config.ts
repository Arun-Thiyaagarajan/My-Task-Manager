
import type { FormField, AdminConfig } from './types';
import { 
    FileText, 
    Type, 
    ListTodo, 
    GitMerge, 
    Link2, 
    Paperclip, 
    Users, 
    Bug, 
    GitPullRequest,
    Cloud, 
    Calendar,
    StickyNote,
    Tags,
    Container
} from 'lucide-react';

export const ICONS = {
    text: Type,
    textarea: FileText,
    select: ListTodo,
    multiselect: GitMerge,
    attachments: Paperclip,
    users: Users,
    bug: Bug,
    pr: GitPullRequest,
    deployment: Cloud,
    date: Calendar,
    comments: StickyNote,
    tags: Tags,
    group: Container,
};

export const MASTER_FORM_FIELDS: Record<string, FormField> = {
    title: {
        id: 'title',
        label: 'Title',
        type: 'text',
        placeholder: 'E.g. Fix login button',
        description: 'A short, descriptive title for the task.',
        defaultValue: '',
        icon: 'text',
        group: 'Core Details',
        isCore: true,
    },
    description: {
        id: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe the task in detail...',
        description: 'Provide a thorough description of what needs to be done.',
        defaultValue: '',
        icon: 'textarea',
        group: 'Core Details',
        isCore: true,
    },
};


export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
    formLayout: ['title', 'description'],
    fieldConfig: {
        title: {
            visible: true,
            required: true,
        },
        description: {
            visible: true,
            required: true,
        },
    },
    groupOrder: [
        'Core Details',
        'Assignment & Tracking',
        'Dates',
        'Advanced',
        'Tagging',
        'Custom Fields',
    ],
}
