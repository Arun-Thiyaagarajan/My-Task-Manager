'use client';

const TASK_LIST_NAVIGATION_KEY = 'taskflow_task_list_navigation_pending';

export function isTaskListHref(href: string) {
  return href === '/' || href.startsWith('/?');
}

export function markTaskListNavigation(href: string) {
  if (typeof window === 'undefined' || !isTaskListHref(href)) return;
  window.sessionStorage.setItem(TASK_LIST_NAVIGATION_KEY, '1');
}

export function consumeTaskListNavigation() {
  if (typeof window === 'undefined') return false;
  const shouldShow = window.sessionStorage.getItem(TASK_LIST_NAVIGATION_KEY) === '1';
  if (shouldShow) {
    window.sessionStorage.removeItem(TASK_LIST_NAVIGATION_KEY);
  }
  return shouldShow;
}

export function hasPendingTaskListNavigation() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(TASK_LIST_NAVIGATION_KEY) === '1';
}

export function clearPendingTaskListNavigation() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TASK_LIST_NAVIGATION_KEY);
}
