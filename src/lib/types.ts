
import type { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Repository = (typeof REPOSITORIES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];
export type Developer = string;

export interface Company {
  id: string;
  name: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: 'link' | 'file';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  
  // Optional fields managed by admin config
  comments?: string[];
  attachments?: Attachment[];
  repositories?: Repository[];
  azureWorkItemId?: string;
  prLinks?: {
    [key in Environment]?: { [repo: string]: string };
  };
  deploymentStatus?: {
    [key in Environment]?: boolean;
  };
  othersEnvironmentName?: string;
  developers?: Developer[];
  qaIssueIds?: string;
  devStartDate?: string;
  devEndDate?: string;
  qaStartDate?: string;
  qaEndDate?: string;
  stageDate?: string;
  productionDate?: string;
  othersDate?: string;

  // For custom fields
  [key: string]: any;
}

// Types for Dynamic Form Configuration
export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'attachments' | 'deployment' | 'pr-links';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  disablePastDatesFrom?: string;
  icon: string;
  isCustom?: boolean;
}

export interface FormFieldConfig {
  visible: boolean;
  required: boolean;
}

export interface AdminConfig {
  formLayout: string[]; // Array of field IDs to determine order
  fieldConfig: Record<string, FormFieldConfig>; // Config for each field
}
