import type { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Repository = (typeof REPOSITORIES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];
export type Developer = string;

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
  deploymentStatus: {
    [key in Environment]?: boolean;
  };
  othersEnvironmentName?: string;
  developers?: Developer[];
  qaIssueIds?: string[];
  devStartDate?: string;
  devEndDate?: string;
  qaStartDate?: string;
  qaEndDate?: string;
  stageDate?: string;
  productionDate?: string;
  othersDate?: string;
  createdAt: string;
  updatedAt: string;
}
