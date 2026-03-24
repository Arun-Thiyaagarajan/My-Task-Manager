import * as React from 'react';
import type { CSSProperties } from 'react';
import type { StatusConfigItem, TaskStatus, UiConfig } from './types';
import { DEFAULT_STATUS_CONFIGS, TASK_STATUSES } from './constants';
import {
  Circle,
  Loader2,
  GitPullRequest,
  Bug,
  CheckCircle2,
  PauseCircle,
  Clock3,
  PlayCircle,
  ListChecks,
  CircleDashed,
  ShieldCheck,
  FlaskConical,
  Rocket,
  Flag,
  AlertTriangle,
  SearchCheck,
  Archive,
  Wrench,
  PackageCheck,
  type LucideIcon,
} from 'lucide-react';

const STATUS_ICON_REGISTRY: Record<string, LucideIcon> = {
  circle: Circle,
  'loader-2': Loader2,
  'git-pull-request': GitPullRequest,
  bug: Bug,
  'check-circle-2': CheckCircle2,
  'pause-circle': PauseCircle,
  'clock-3': Clock3,
  'play-circle': PlayCircle,
  'list-checks': ListChecks,
  'circle-dashed': CircleDashed,
  'shield-check': ShieldCheck,
  'flask-conical': FlaskConical,
  rocket: Rocket,
  flag: Flag,
  'alert-triangle': AlertTriangle,
  'search-check': SearchCheck,
  archive: Archive,
  wrench: Wrench,
  'package-check': PackageCheck,
};

const DEFAULT_STATUS_ID_FALLBACK = 'todo';

function normalizeStatusIcon(status: Pick<StatusConfigItem, 'icon' | 'iconType' | 'name' | 'color'>) {
  if (status.iconType === 'image' && status.icon) return { icon: status.icon, iconType: 'image' as const };

  const icon = status.icon && STATUS_ICON_REGISTRY[status.icon] ? status.icon : pickDefaultIconName(status.name, status.color);
  return { icon, iconType: 'lucide' as const };
}

function normalizeStatusAliases(status: Pick<StatusConfigItem, 'id' | 'name' | 'aliases'>) {
  return Array.from(
    new Set([status.name, status.id, ...(status.aliases || [])].filter(Boolean).map(value => value.trim()))
  );
}

export function pickDefaultIconName(name: string, color?: string) {
  const normalized = name.trim().toLowerCase();

  if (normalized.includes('progress') || normalized.includes('doing') || normalized.includes('active')) return 'loader-2';
  if (normalized.includes('review') || normalized.includes('pr')) return 'git-pull-request';
  if (normalized === 'qa' || normalized.includes('test') || normalized.includes('bug')) return 'bug';
  if (normalized.includes('done') || normalized.includes('complete') || normalized.includes('closed')) return 'check-circle-2';
  if (normalized.includes('hold') || normalized.includes('pause') || normalized.includes('blocked')) return 'pause-circle';
  if (normalized.includes('start') || normalized.includes('next')) return 'play-circle';

  if (typeof color === 'string') {
    const lower = color.toLowerCase();
    if (lower === '#16a34a' || lower === '#22c55e') return 'check-circle-2';
    if (lower === '#2563eb' || lower === '#3b82f6') return 'loader-2';
    if (lower === '#d97706' || lower === '#f59e0b') return 'bug';
  }

  return 'circle';
}

export function buildStatusConfigItem(
  partial: Partial<StatusConfigItem> & Pick<StatusConfigItem, 'name'>,
  order: number
): StatusConfigItem {
  const id = partial.id || partial.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_') || `status_${order + 1}`;
  const color = partial.color || DEFAULT_STATUS_CONFIGS[Math.min(order, DEFAULT_STATUS_CONFIGS.length - 1)]?.color || '#64748b';
  const iconData = normalizeStatusIcon({
    icon: partial.icon || '',
    iconType: partial.iconType,
    name: partial.name,
    color,
  });

  return {
    id,
    name: partial.name.trim(),
    color,
    order,
    isDefault: partial.isDefault ?? false,
    aliases: normalizeStatusAliases({ id, name: partial.name.trim(), aliases: partial.aliases }),
    ...iconData,
  };
}

export function getStatusConfigs(uiConfig?: UiConfig | null): StatusConfigItem[] {
  try {
    const config = uiConfig || null;
    const raw = config?.statusConfigs;

    if (Array.isArray(raw) && raw.length > 0) {
      return raw
        .filter((status): status is StatusConfigItem => !!status?.name?.trim())
        .map((status, index) => buildStatusConfigItem(status, typeof status.order === 'number' ? status.order : index))
        .sort((a, b) => a.order - b.order);
    }

    const legacyStatuses = config?.taskStatuses?.length ? config.taskStatuses : [...TASK_STATUSES];
    return legacyStatuses.map((statusName, index) => {
      const defaultMatch = DEFAULT_STATUS_CONFIGS.find(defaultStatus => defaultStatus.name === statusName);
      return buildStatusConfigItem(defaultMatch || { name: statusName }, index);
    });
  } catch {
    return DEFAULT_STATUS_CONFIGS.map((status, index) => buildStatusConfigItem(status, index));
  }
}

export function getStatusOptions(uiConfig?: UiConfig | null) {
  return getStatusConfigs(uiConfig).map(status => ({ id: status.id, label: status.name, value: status.name }));
}

export function resolveStatusConfig(statusValue: TaskStatus, uiConfig?: UiConfig | null): StatusConfigItem {
  const statuses = getStatusConfigs(uiConfig);
  const fallback =
    statuses.find(status => status.id === DEFAULT_STATUS_ID_FALLBACK) ||
    statuses[0] ||
    buildStatusConfigItem(DEFAULT_STATUS_CONFIGS[0], 0);

  const exact = statuses.find(status => status.name === statusValue || status.id === statusValue);
  if (exact) return exact;

  const alias = statuses.find(status => (status.aliases || []).includes(statusValue));
  if (alias) return alias;

  return fallback;
}

export function getStatusDisplayName(statusValue: TaskStatus, uiConfig?: UiConfig | null) {
  if (!statusValue) return '';
  return resolveStatusConfig(statusValue, uiConfig).name;
}

export function getStatusId(statusValue: TaskStatus, uiConfig?: UiConfig | null) {
  return resolveStatusConfig(statusValue, uiConfig).id;
}

export function isStatusValue(statusValue: TaskStatus, statusId: string, uiConfig?: UiConfig | null) {
  return getStatusId(statusValue, uiConfig) === statusId;
}

export function syncTaskStatuses(config: UiConfig): UiConfig {
  const statusConfigs = getStatusConfigs(config);
  const statusOptions = getStatusOptions({ ...config, statusConfigs });

  return {
    ...config,
    statusConfigs,
    taskStatuses: statusConfigs.map(status => status.name),
    fields: config.fields.map(field =>
      field.key === 'status'
        ? { ...field, options: statusOptions }
        : field
    ),
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;

  const numeric = Number.parseInt(value, 16);
  if (Number.isNaN(numeric)) return { r: 100, g: 116, b: 139 };

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function getContrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? '#111827' : '#f8fafc';
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getStatusStyles(statusValue: TaskStatus, uiConfig?: UiConfig | null) {
  const status = resolveStatusConfig(statusValue, uiConfig);
  const textColor = getContrastText(status.color);

  return {
    defaultStyle: {
      backgroundColor: rgba(status.color, 0.22),
      borderColor: rgba(status.color, 0.48),
      color: status.color,
    } satisfies CSSProperties,
    prominentStyle: {
      backgroundColor: status.color,
      borderColor: status.color,
      color: textColor,
    } satisfies CSSProperties,
    defaultIconStyle: {
      color: status.color,
    } satisfies CSSProperties,
    prominentIconStyle: {
      color: textColor,
    } satisfies CSSProperties,
    cardStyle: {
      backgroundColor: rgba(status.color, 0.1),
      borderColor: rgba(status.color, 0.2),
    } satisfies CSSProperties,
    backgroundIconStyle: {
      color: rgba(status.color, 0.22),
    } satisfies CSSProperties,
    textColor,
  };
}

export function getStatusIconComponent(statusValue: TaskStatus, uiConfig?: UiConfig | null) {
  const status = resolveStatusConfig(statusValue, uiConfig);

  if (status.iconType === 'image' && status.icon) return null;
  return STATUS_ICON_REGISTRY[status.icon] || STATUS_ICON_REGISTRY[pickDefaultIconName(status.name, status.color)] || Circle;
}

export function shouldSpinStatusIcon(statusValue: TaskStatus, uiConfig?: UiConfig | null) {
  return isStatusValue(statusValue, 'in_progress', uiConfig);
}

interface StatusIconProps {
  status: TaskStatus;
  className?: string;
  uiConfig?: UiConfig | null;
  style?: CSSProperties;
}

export function StatusIcon({ status, className, uiConfig, style }: StatusIconProps) {
  const resolved = resolveStatusConfig(status, uiConfig);

  if (resolved.iconType === 'image' && resolved.icon) {
    return (
      <img
        src={resolved.icon}
        alt=""
        aria-hidden="true"
        className={className}
        style={style}
      />
    );
  }

  const Icon = getStatusIconComponent(status, uiConfig);
  if (!Icon) return null;

  return (
    <Icon
      className={className}
      style={style}
    />
  );
}

export const AVAILABLE_STATUS_ICONS = [
  { value: 'circle', label: 'Circle' },
  { value: 'loader-2', label: 'Loader' },
  { value: 'git-pull-request', label: 'Pull Request' },
  { value: 'bug', label: 'Bug' },
  { value: 'check-circle-2', label: 'Check' },
  { value: 'pause-circle', label: 'Pause' },
  { value: 'clock-3', label: 'Clock' },
  { value: 'play-circle', label: 'Play' },
  { value: 'list-checks', label: 'Checklist' },
  { value: 'circle-dashed', label: 'Queued' },
  { value: 'shield-check', label: 'Approved' },
  { value: 'flask-conical', label: 'Testing' },
  { value: 'rocket', label: 'Release' },
  { value: 'flag', label: 'Flagged' },
  { value: 'alert-triangle', label: 'Blocked' },
  { value: 'search-check', label: 'Verified' },
  { value: 'archive', label: 'Archived' },
  { value: 'wrench', label: 'Working' },
  { value: 'package-check', label: 'Ready' },
];

export const STATUS_COLOR_SWATCHES = [
  '#64748b',
  '#2563eb',
  '#0f766e',
  '#9333ea',
  '#d97706',
  '#dc2626',
  '#16a34a',
  '#0891b2',
  '#7c3aed',
  '#ea580c',
  '#ca8a04',
  '#475569',
];
