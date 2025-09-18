

import type { TASK_STATUSES, ENVIRONMENTS } from './constants';

export type TaskStatus = string;
export type Repository = string;
export type Environment = (typeof ENVIRONMENTS)[number];
export type FieldType = 'text' | 'textarea' | 'number' | 'url' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'tags' | 'object';
export type PersonFieldType = 'text' | 'textarea' | 'url' | 'number' | 'date';

export interface PersonField {
  id: string;
  label: string;
  value: string;
  type: PersonFieldType;
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  additionalFields?: PersonField[];
}
export type Developer = Person;
export type Tester = Person;


export interface Company {
  id: string;
  name: string;
}

export interface Attachment {
  name: string;
  url: string; // Will hold the link URL or the image Data URI
  type: 'link' | 'image';
}

export interface RepositoryConfig {
  id:string;
  name: string;
  baseUrl: string;
}

export interface Log {
  id: string;
  timestamp: string;
  message: string;
  taskId?: string;
  details?: Record<string, any>;
}

export interface Comment {
  text: string;
  timestamp: string;
}

export interface GeneralReminder {
  id: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  summary?: string | null;
  deletedAt?: string;
  isFavorite?: boolean;
  reminder?: string | null;
  reminderExpiresAt?: string | null;
  
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
  developers?: string[]; // Storing Person IDs
  testers?: string[]; // Storing Person IDs
  comments?: Comment[];
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
  baseUrl?: string;
  sortDirection?: 'asc' | 'desc' | 'manual';
}

export interface UiConfig {
  fields: FieldConfig[];
  environments: string[];
  repositoryConfigs: RepositoryConfig[];
  taskStatuses: string[];
  appName?: string;
  appIcon?: string | null;
  remindersEnabled?: boolean;
  tutorialEnabled?: boolean;
  timeFormat?: '12h' | '24h';
  autoBackupEnabled?: boolean;
}

export interface CompanyData {
    tasks: Task[];
    trash: Task[];
    developers: Person[];
    testers: Person[];
    uiConfig: UiConfig;
    logs: Log[];
    generalReminders: GeneralReminder[];
}

export interface MyTaskManagerData {
    companies: Company[];
    activeCompanyId: string;
    companyData: {
        [companyId: string]: CompanyData;
    };
}
