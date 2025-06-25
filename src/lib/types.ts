import type { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from './constants';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Repository = (typeof REPOSITORIES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  repository: Repository;
  azureId?: string;
  prLinks: {
    [key in Environment]?: string[];
  };
}
