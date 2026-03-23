
import type { TASK_STATUSES } from './constants';

export type TaskStatus = string;
export type Repository = string;
export type Environment = { id: string; name: string; color: string; isMandatory?: boolean };
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
  size?: number;
  uploadedAt?: string;
  mimeType?: string;
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
  userId?: string;
  userName?: string;
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

export interface NoteLayout {
  i: string; // Corresponds to note.id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  layout: NoteLayout;
}

export type ReleaseItemType = 'feature' | 'improvement' | 'fix';

export interface ReleaseItem {
    id: string;
    type: ReleaseItemType;
    text: string;
    link?: string;
    imageUrl?: string;
}

export interface ReleaseUpdate {
    id: string;
    version: string;
    date: string;
    title: string;
    description?: string;
    items: ReleaseItem[];
    isPublished: boolean;
}

export interface UserPreferences {
  viewMode?: 'grid' | 'table';
  sortDescriptor?: string;
  dateView?: 'all' | 'monthly' | 'yearly';
  taskFilters?: {
    status?: string[];
    repo?: string[];
    deployment?: string[];
    tags?: string[];
  };
  noteFilters?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  sidebarPosition?: 'left' | 'right';
  favoritesOnly?: boolean;
  tutorialSeen?: boolean;
  tutorialButtonHintSeen?: boolean;
  notificationSounds?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  summary?: string | null;
  deletedAt?: string | null;
  isFavorite?: boolean;
  reminder?: string | null;
  reminderExpiresAt?: string | null;
  
  repositories?: Repository[];
  azureWorkItemId?: string;
  tags?: string[];
  prLinks?: {
    [key: string]: { [repo: string]: string } | undefined;
  };
  deploymentStatus?: {
    [key: string]: boolean | undefined;
  };
  deploymentDates?: {
    [key: string]: string | null | undefined;
  };
  relevantEnvironments?: string[];
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

export interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  photoURL?: string | null;
  previousPhotoURL?: string | null;
  role?: 'admin' | 'user';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export type AuthMode = 'localStorage' | 'authenticate';

export interface LocalProfile {
  username?: string;
  photoURL?: string | null;
  previousPhotoURL?: string | null;
}

export interface UiConfig {
  fields: FieldConfig[];
  environments: Environment[];
  repositoryConfigs: RepositoryConfig[];
  taskStatuses: string[];
  appName?: string;
  appIcon?: string | null;
  previousAppIcon?: string | null;
  remindersEnabled?: boolean;
  tutorialEnabled?: boolean;
  timeFormat?: '12h' | '24h';
  autoBackupFrequency?: BackupFrequency;
  autoBackupTime?: number;
  currentVersion: string;
  authenticationMode: AuthMode;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'off';

export interface CompanyData {
    tasks: Task[];
    trash: Task[];
    developers: Person[];
    testers: Person[];
    notes: Note[];
    uiConfig: UiConfig;
    logs: Log[];
    generalReminders: GeneralReminder[];
    releaseUpdates: ReleaseUpdate[];
}

export interface MyTaskManagerData {
    companies: Company[];
    activeCompanyId: string;
    companyData: {
        [companyId: string]: CompanyData;
    };
    notifications?: AppNotification[];
    localProfile?: LocalProfile;
}

export interface FieldConfig {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  group: string;
  isActive: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isCustom: boolean;
  order: number;
  options?: FieldOption[];
  baseUrl?: string;
  sortDirection?: 'asc' | 'desc' | 'manual';
  defaultValue?: any;
}

export type FeedbackType = "Bug Report" | "Feature Request" | "Suggestion" | "Other";
export type FeedbackPriority = "Low" | "Medium" | "High";
export type FeedbackStatus = "Submitted" | "Reviewed" | "Closed" | "In Progress" | "Resolved";

export interface Feedback {
  id: string;
  userId: string;
  userName?: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  contactEmail?: string;
  status: FeedbackStatus;
  appVersion: string;
  environment: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface AppNotification {
  id: string;
  recipientId: string; // User UID or 'admin'
  type: 'user_request' | 'admin_reply' | 'system';
  title: string;
  message: string;
  link: string;
  timestamp: string;
  read: boolean;
  senderId?: string;
  senderName?: string;
}

export type AdminNotification = AppNotification;
