
import type { TASK_STATUSES, ENVIRONMENTS } from './constants';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Repository = string;
export type Environment = (typeof ENVIRONMENTS)[number];
export type Developer = string;
export type FieldType = 'text' | 'textarea' | 'number' | 'url' | 'date' | 'select' | 'multiselect' | 'checkbox';


export interface Company {
  id: string;
  name: string;
}

export interface Attachment {
  name:string;
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
  
  repositories?: Repository[];
  azureWorkItemId?: string;
  prLinks?: {
    [key: string]: { [repo: string]: string } | undefined;
  };
  deploymentStatus?: {
    [key: string]: boolean | undefined;
  };
  deploymentDates?: {
    [key: string]: string | null | undefined;
  };
  developers?: Developer[];
  comments?: string[];
  attachments?: Attachment[];
  
  devStartDate?: string | null;
  devEndDate?: string | null;
  qaStartDate?: string | null;
  qaEndDate?: string | null;

  customFields?: Record<string, any>;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldConfig {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  group: string;
  isActive: boolean;
  isRequired: boolean;
  isCustom: boolean;
  order: number;
  options?: FieldOption[];
}

export interface UiConfig {
  fields: FieldConfig[];
}
