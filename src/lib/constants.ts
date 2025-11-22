

import type { FieldConfig, FieldType, RepositoryConfig } from './types';

export const TASK_STATUSES = ['To Do', 'In Progress', 'Code Review', 'QA', 'Hold', 'Done'] as const;
export const ENVIRONMENTS = ['dev', 'stage', 'production'] as const;

export const INITIAL_REPOSITORY_CONFIGS: RepositoryConfig[] = [
    { id: 'repo_1', name: 'UI-Dashboard', baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/UI-Dashboard/pullrequest/' },
    { id: 'repo_2', name: 'UI-Admin', baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/UI-Admin/pullrequest/' },
    { id: 'repo_3', name: 'Templates', baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/Templates/pullrequest/' },
    { id: 'repo_4', name: 'API-Export', baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/API-Export/pullrequest/' },
];

export const FIELD_TYPES: {value: FieldType, label: string}[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'url', label: 'URL' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Single Select' },
    { value: 'multiselect', label: 'Multi Select' },
    { value: 'tags', label: 'Tag Selection' },
    { value: 'checkbox', label: 'Checkbox' },
]

export const INITIAL_UI_CONFIG: FieldConfig[] = [
  { id: 'field_title', key: 'title', label: 'Title', type: 'text', group: 'Core Details', isActive: true, isRequired: true, isCustom: false, order: 0 },
  { id: 'field_description', key: 'description', label: 'Description', type: 'textarea', group: 'Core Details', isActive: true, isRequired: true, isCustom: false, order: 1 },
  { id: 'field_status', key: 'status', label: 'Status', type: 'select', group: 'Core Details', isActive: true, isRequired: true, isCustom: false, order: 2, options: TASK_STATUSES.map(s => ({id: s, value: s, label: s})) },
  { id: 'field_repositories', key: 'repositories', label: 'Repositories', type: 'multiselect', group: 'Assignment & Tracking', isActive: true, isRequired: true, isCustom: false, order: 3, options: INITIAL_REPOSITORY_CONFIGS.map(r => ({id: r.id, value: r.name, label: r.name})) },
  { id: 'field_developers', key: 'developers', label: 'Developers', type: 'tags', group: 'Assignment & Tracking', isActive: true, isRequired: true, isCustom: false, order: 4, options: [] },
  { id: 'field_testers', key: 'testers', label: 'Testers', type: 'tags', group: 'Assignment & Tracking', isActive: true, isRequired: false, isCustom: false, order: 5, options: [] },
  { id: 'field_azureWorkItemId', key: 'azureWorkItemId', label: 'Azure Work Item ID', type: 'text', group: 'Assignment & Tracking', isActive: true, isRequired: false, isCustom: false, order: 6, baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_workitems/edit/' },
  { id: 'field_tags', key: 'tags', label: 'Tags', type: 'tags', group: 'Assignment & Tracking', isActive: true, isRequired: false, isCustom: false, order: 7, options: [] },
  { id: 'field_prLinks', key: 'prLinks', label: 'Pull Request Links', type: 'object', group: 'Pull Requests', isActive: true, isRequired: false, isCustom: false, order: 8 },
  { id: 'field_attachments', key: 'attachments', label: 'Attachments', type: 'object', group: 'Attachments', isActive: true, isRequired: false, isCustom: false, order: 9 },
  { id: 'field_deploymentStatus', key: 'deploymentStatus', label: 'Deployment Status', type: 'object', group: 'Deployment', isActive: true, isRequired: false, isCustom: false, order: 10 },
  { id: 'field_relevantEnvs', key: 'relevantEnvironments', label: 'Relevant Environments', type: 'multiselect', group: 'Deployment', isActive: true, isRequired: false, isCustom: false, order: 11 },
  { id: 'field_devStartDate', key: 'devStartDate', label: 'Dev Start Date', type: 'date', group: 'Dates', isActive: true, isRequired: false, isCustom: false, order: 12 },
  { id: 'field_devEndDate', key: 'devEndDate', label: 'Dev End Date', type: 'date', group: 'Dates', isActive: true, isRequired: false, isCustom: false, order: 13 },
  { id: 'field_qaStartDate', key: 'qaStartDate', label: 'QA Start Date', type: 'date', group: 'Dates', isActive: true, isRequired: false, isCustom: false, order: 14 },
  { id: 'field_qaEndDate', key: 'qaEndDate', label: 'QA End Date', type: 'date', group: 'Dates', isActive: true, isRequired: false, isCustom: false, order: 15 },
  { id: 'field_comments', key: 'comments', label: 'Comments', type: 'text', group: 'Comments', isActive: true, isRequired: false, isCustom: false, order: 16 },
];
