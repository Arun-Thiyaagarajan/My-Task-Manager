import type { Task, UiConfig } from './types';

const getField = (uiConfig: UiConfig | null | undefined, key: string) =>
  uiConfig?.fields?.find((field) => field.key === key);

export const isUiFieldActive = (uiConfig: UiConfig | null | undefined, key: string): boolean => {
  const field = getField(uiConfig, key);
  return field ? field.isActive : true;
};

export const isRepositoryFieldActive = (uiConfig: UiConfig | null | undefined): boolean =>
  isUiFieldActive(uiConfig, 'repositories');

export const shouldShowPrLinks = (uiConfig: UiConfig | null | undefined): boolean =>
  isRepositoryFieldActive(uiConfig) && isUiFieldActive(uiConfig, 'prLinks');

export const getTaskRepositories = (task: Pick<Task, 'repositories'>, uiConfig: UiConfig | null | undefined): string[] =>
  isRepositoryFieldActive(uiConfig) && Array.isArray(task.repositories) ? task.repositories : [];

export const hasTaskRepositories = (task: Pick<Task, 'repositories'>, uiConfig: UiConfig | null | undefined): boolean =>
  getTaskRepositories(task, uiConfig).length > 0;
