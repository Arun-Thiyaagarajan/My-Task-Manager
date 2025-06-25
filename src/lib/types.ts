
import type { TASK_STATUSES, ENVIRONMENTS } from './constants';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Repository = string;
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
}
