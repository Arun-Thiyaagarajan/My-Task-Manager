
import type { FieldConfig } from './types';

export const TASK_STATUSES = ['To Do', 'In Progress', 'Code Review', 'QA', 'Done'] as const;
export const ENVIRONMENTS = ['dev', 'stage', 'production'] as const;
export const REPOSITORIES = ['UI-Dashboard', 'UI-Admin', 'Templates', 'API-Export', 'Other'] as const;

export const INITIAL_UI_CONFIG: { [key: string]: FieldConfig } = {
  title: { label: 'Title', isActive: true, isRequired: true, group: 'Core Details' },
  description: { label: 'Description', isActive: true, isRequired: true, group: 'Core Details' },
  status: { label: 'Status', isActive: true, isRequired: true, group: 'Core Details' },
  repositories: { label: 'Repositories', isActive: true, isRequired: false, group: 'Assignment & Tracking' },
  developers: { label: 'Developers', isActive: true, isRequired: false, group: 'Assignment & Tracking' },
  azureWorkItemId: { label: 'Azure Work Item ID', isActive: true, isRequired: false, group: 'Assignment & Tracking' },
  prLinks: { label: 'Pull Request Links', isActive: true, isRequired: false, group: 'Pull Requests' },
  attachments: { label: 'Attachments', isActive: true, isRequired: false, group: 'Attachments' },
  deploymentStatus: { label: 'Deployment Status', isActive: true, isRequired: false, group: 'Deployment' },
  deploymentDates: { label: 'Deployment Dates', isActive: true, isRequired: false, group: 'Dates' },
  devStartDate: { label: 'Dev Start Date', isActive: true, isRequired: false, group: 'Dates' },
  devEndDate: { label: 'Dev End Date', isActive: true, isRequired: false, group: 'Dates' },
  qaStartDate: { label: 'QA Start Date', isActive: true, isRequired: false, group: 'Dates' },
  qaEndDate: { label: 'QA End Date', isActive: true, isRequired: false, group: 'Dates' },
};
