import type { Attachment, Person, Task, UiConfig } from './types';

import LZString from 'lz-string';

export interface SharedFieldMetadata {
  l: string;
  t: string;
  u?: string;
}

interface SharedAttachmentSnapshot {
  n: string;
  u: string;
  t: Attachment['type'];
  z?: number;
  a?: string;
  m?: string;
}

export interface TaskShareSnapshot {
  t: string;
  d: string;
  s: string;
  py?: Task['priority'];
  u?: string | null;
  g?: string[];
  r?: string[];
  e?: string[];
  st?: Record<string, boolean>;
  dt?: Record<string, string>;
  at?: SharedAttachmentSnapshot[];
  sd?: string | null;
  ed?: string | null;
  qsd?: string | null;
  qed?: string | null;
  da?: string | null;
  dca?: string | null;
  dra?: string | null;
  drp?: Task['dueReminderPreset'];
  cf?: Record<string, any>;
  dv?: string[];
  ts?: string[];
  pr?: Task['prLinks'];
  az?: string;
  up: string;
  cm?: Task['comments'];
  fm?: Record<string, SharedFieldMetadata>;
}

interface BuildTaskShareSnapshotOptions {
  includeInlineAttachments?: boolean;
  maxInlineAttachmentBytes?: number;
}

export type SharedTaskViewConfig = Pick<
  UiConfig,
  'appName' | 'appIcon' | 'fields' | 'environments' | 'repositoryConfigs' | 'taskStatuses' | 'statusConfigs' | 'timeFormat'
>;

export interface SharedTaskLinkDocument {
  token: string;
  taskId: string;
  ownerUserId: string;
  companyId: string;
  createdAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  passwordProtected?: boolean;
  version: number;
  viewConfig: SharedTaskViewConfig;
  snapshot?: TaskShareSnapshot;
  encryptedPayload?: {
    salt: string;
    iv: string;
    cipherText: string;
  };
}

const DEFAULT_FIELD_LABELS: Record<string, string> = {
  developers: 'Developers',
  testers: 'Testers',
  repositories: 'Repositories',
  status: 'Status',
  tags: 'Tags',
  attachments: 'Attachments',
  prLinks: 'Pull Request Links',
  deploymentStatus: 'Deployment Status',
  description: 'Description',
  title: 'Title',
  priority: 'Priority',
  summary: 'Summary',
  azureWorkItemId: 'Azure Work Item ID',
  devStartDate: 'Dev Start Date',
  devEndDate: 'Dev End Date',
  qaStartDate: 'QA Start Date',
  qaEndDate: 'QA End Date',
  dueAt: 'Due Date',
  dueCompletedAt: 'Due Completed At',
  dueReminderAt: 'Due Reminder At',
  dueReminderPreset: 'Due Reminder Preset',
  comments: 'Comments',
  customFields: 'Other Details',
};

const DEFAULT_SHARED_FIELD_METADATA: Record<string, SharedFieldMetadata> = {
  title: { l: 'Title', t: 'text' },
  description: { l: 'Description', t: 'textarea' },
  status: { l: 'Status', t: 'select' },
  priority: { l: 'Priority', t: 'select' },
  summary: { l: 'Summary', t: 'text' },
  tags: { l: 'Tags', t: 'tags' },
  repositories: { l: 'Repositories', t: 'multiselect' },
  developers: { l: 'Developers', t: 'tags' },
  testers: { l: 'Testers', t: 'tags' },
  azureWorkItemId: { l: 'Azure Work Item ID', t: 'text' },
  prLinks: { l: 'Pull Request Links', t: 'object' },
  attachments: { l: 'Attachments', t: 'object' },
  deploymentStatus: { l: 'Deployment Status', t: 'object' },
  relevantEnvironments: { l: 'Relevant Environments', t: 'multiselect' },
  devStartDate: { l: 'Dev Start Date', t: 'date' },
  devEndDate: { l: 'Dev End Date', t: 'date' },
  qaStartDate: { l: 'QA Start Date', t: 'date' },
  qaEndDate: { l: 'QA End Date', t: 'date' },
  dueAt: { l: 'Due Date', t: 'date' },
  dueCompletedAt: { l: 'Due Completed At', t: 'date' },
  dueReminderAt: { l: 'Due Reminder At', t: 'date' },
  dueReminderPreset: { l: 'Due Reminder Preset', t: 'select' },
  comments: { l: 'Comments', t: 'object' },
  customFields: { l: 'Other Details', t: 'object' },
};

export function buildSharedTaskViewConfig(uiConfig: UiConfig): SharedTaskViewConfig {
  return {
    appName: uiConfig.appName,
    appIcon: uiConfig.appIcon,
    fields: uiConfig.fields,
    environments: uiConfig.environments,
    repositoryConfigs: uiConfig.repositoryConfigs,
    taskStatuses: uiConfig.taskStatuses,
    statusConfigs: uiConfig.statusConfigs,
    timeFormat: uiConfig.timeFormat,
  };
}

export function buildSharedFieldMetadata(uiConfig: UiConfig, task?: Pick<Task, 'customFields'> | null): Record<string, SharedFieldMetadata> {
  const usedCustomKeys = Object.keys(task?.customFields || {});
  const metadata: Record<string, SharedFieldMetadata> = { ...DEFAULT_SHARED_FIELD_METADATA };

  uiConfig.fields.forEach((field) => {
    const isCustom = field.isCustom;
    const isRenamed = DEFAULT_FIELD_LABELS[field.key] && DEFAULT_FIELD_LABELS[field.key] !== field.label;
    const hasBaseUrl = Boolean(field.baseUrl);

    if (!isCustom && !isRenamed && !hasBaseUrl) {
      return;
    }

    const isUsed = isCustom ? usedCustomKeys.includes(field.key) : true;
    if (isUsed || field.key === 'status') {
      metadata[field.key] = {
        l: field.label,
        t: field.type,
        u: field.baseUrl || undefined,
      };
    }
  });

  return metadata;
}

export function buildTaskShareSnapshot(
  task: Task,
  uiConfig: UiConfig,
  developers: Person[],
  testers: Person[],
  options: BuildTaskShareSnapshotOptions = {}
): TaskShareSnapshot {
  const developerMap = new Map(developers.map((person) => [person.id, person.name]));
  const testerMap = new Map(testers.map((person) => [person.id, person.name]));
  const fieldMetadata = buildSharedFieldMetadata(uiConfig, task);
  const includeInlineAttachments = Boolean(options.includeInlineAttachments);
  const maxInlineAttachmentBytes = options.maxInlineAttachmentBytes ?? 450_000;
  let remainingInlineAttachmentBytes = maxInlineAttachmentBytes;

  const prunedStatus: Record<string, boolean> = {};
  Object.entries(task.deploymentStatus || {}).forEach(([key, value]) => {
    if (value) prunedStatus[key] = value;
  });

  const prunedDates: Record<string, string> = {};
  Object.entries(task.deploymentDates || {}).forEach(([key, value]) => {
    if (value) prunedDates[key] = value as string;
  });

  const sharedAttachments = (task.attachments || []).flatMap((attachment) => {
    const isInlineAttachment = attachment.url.startsWith('data:');

    if (isInlineAttachment && !includeInlineAttachments) {
      return [];
    }

    if (isInlineAttachment) {
      const inlineAttachmentBytes = new TextEncoder().encode(attachment.url).length;
      if (inlineAttachmentBytes > remainingInlineAttachmentBytes) {
        return [];
      }
      remainingInlineAttachmentBytes -= inlineAttachmentBytes;
    }

    return [{
      n: attachment.name,
      u: attachment.url,
      t: attachment.type,
      z: attachment.size,
      a: attachment.uploadedAt,
      m: attachment.mimeType,
    }];
  });

  return {
    t: task.title,
    d: task.description,
    s: task.status,
    py: task.priority || undefined,
    u: task.summary || undefined,
    g: task.tags?.length ? task.tags : undefined,
    r: task.repositories?.length ? task.repositories : undefined,
    e: task.relevantEnvironments?.length ? task.relevantEnvironments : undefined,
    st: Object.keys(prunedStatus).length ? prunedStatus : undefined,
    dt: Object.keys(prunedDates).length ? prunedDates : undefined,
    at: sharedAttachments,
    sd: task.devStartDate || undefined,
    ed: task.devEndDate || undefined,
    qsd: task.qaStartDate || undefined,
    qed: task.qaEndDate || undefined,
    da: task.dueAt || undefined,
    dca: task.dueCompletedAt || undefined,
    dra: task.dueReminderAt || undefined,
    drp: task.dueReminderPreset || undefined,
    cf: Object.keys(task.customFields || {}).length ? task.customFields : undefined,
    dv: (task.developers || []).map((id) => developerMap.get(id)).filter(Boolean) as string[],
    ts: (task.testers || []).map((id) => testerMap.get(id)).filter(Boolean) as string[],
    pr: Object.keys(task.prLinks || {}).length ? task.prLinks : undefined,
    az: task.azureWorkItemId || undefined,
    up: task.updatedAt,
    cm: task.comments?.length ? task.comments : undefined,
    fm: Object.keys(fieldMetadata).length ? fieldMetadata : undefined,
  };
}

export function hydrateTaskFromShareSnapshot(taskId: string, snapshot: TaskShareSnapshot): Task {
  return {
    id: taskId,
    title: snapshot.t,
    description: snapshot.d,
    status: snapshot.s,
    priority: snapshot.py || 'medium',
    summary: snapshot.u,
    tags: snapshot.g || [],
    repositories: snapshot.r || [],
    relevantEnvironments: snapshot.e || [],
    deploymentStatus: snapshot.st || {},
    deploymentDates: snapshot.dt || {},
    attachments: (snapshot.at || []).map((attachment) => ({
      name: attachment.n,
      url: attachment.u,
      type: attachment.t,
      size: attachment.z,
      uploadedAt: attachment.a,
      mimeType: attachment.m,
    })),
    devStartDate: snapshot.sd,
    devEndDate: snapshot.ed,
    qaStartDate: snapshot.qsd,
    qaEndDate: snapshot.qed,
    dueAt: snapshot.da,
    dueCompletedAt: snapshot.dca,
    dueReminderAt: snapshot.dra,
    dueReminderPreset: snapshot.drp || null,
    customFields: snapshot.cf || {},
    developers: snapshot.dv || [],
    testers: snapshot.ts || [],
    prLinks: snapshot.pr || {},
    azureWorkItemId: snapshot.az,
    updatedAt: snapshot.up,
    createdAt: snapshot.up,
    comments: snapshot.cm || [],
  };
}

export function encodeTaskShareSnapshot(snapshot: TaskShareSnapshot): string {
  const json = JSON.stringify(snapshot);

  try {
    return LZString.compressToEncodedURIComponent(json);
  } catch {
    return btoa(
      encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    );
  }
}

export function decodeTaskShareSnapshot(payload: string): TaskShareSnapshot | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(payload);
    if (decompressed) {
      return JSON.parse(decompressed) as TaskShareSnapshot;
    }
  } catch {}

  try {
    const decoded = atob(payload)
      .split('')
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('');
    return JSON.parse(decodeURIComponent(decoded)) as TaskShareSnapshot;
  } catch {
    return null;
  }
}

export function buildFallbackTaskShareUrl(origin: string, taskId: string, snapshot: TaskShareSnapshot): string {
  return `${origin}/share/${taskId}?p=${encodeTaskShareSnapshot(snapshot)}`;
}

export function isSharedTaskLinkExpired(link: Pick<SharedTaskLinkDocument, 'expiresAt'> | null | undefined): boolean {
  if (!link?.expiresAt) return false;
  const expiresAt = new Date(link.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}

export function isSharedTaskLinkRevoked(link: Pick<SharedTaskLinkDocument, 'revokedAt'> | null | undefined): boolean {
  return Boolean(link?.revokedAt);
}

function encodeBytes(bytes: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...bytes));
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function derivePasswordKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptTaskShareSnapshot(snapshot: TaskShareSnapshot, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const key = await derivePasswordKey(password, salt);
  const payload = new TextEncoder().encode(JSON.stringify(snapshot));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);

  return {
    salt: encodeBytes(salt),
    iv: encodeBytes(iv),
    cipherText: encodeBytes(new Uint8Array(cipherBuffer)),
  };
}

export async function decryptTaskShareSnapshot(
  encryptedPayload: NonNullable<SharedTaskLinkDocument['encryptedPayload']>,
  password: string
): Promise<TaskShareSnapshot> {
  const salt = decodeBytes(encryptedPayload.salt);
  const iv = decodeBytes(encryptedPayload.iv);
  const cipherBytes = decodeBytes(encryptedPayload.cipherText);
  const key = await derivePasswordKey(password, salt);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  const plainText = new TextDecoder().decode(plainBuffer);
  return JSON.parse(plainText) as TaskShareSnapshot;
}
