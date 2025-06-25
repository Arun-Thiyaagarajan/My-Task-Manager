import type { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS, DEVELOPERS } from './constants';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Repository = (typeof REPOSITORIES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];
export type Developer = (typeof DEVELOPERS)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  repositories: Repository[];
  azureWorkItemId?: string;
  prLinks: {
    [key in Environment]?: string[];
  };
  developers?: Developer[];
  devStartDate?: string;
  devEndDate?: string;
  qaStartDate?: string;
  qaEndDate?: string;
  createdAt: string;
  updatedAt: string;
}
