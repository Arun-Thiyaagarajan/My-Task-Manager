'use client';

import * as React from 'react';
import { driver, type Driver, type DriveStep, type DriverHook } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePathname, useRouter } from 'next/navigation';
import { getUiConfig } from '@/lib/data';
import { applyTutorialPopoverTheme } from '@/lib/tutorial-popover-theme';
import { useUnsavedChanges } from './use-unsaved-changes';

type TutorialRouteKey =
  | 'home'
  | 'task-new'
  | 'task-detail'
  | 'task-edit'
  | 'notes'
  | 'note-new'
  | 'note-detail'
  | 'dashboard'
  | 'insights'
  | 'settings'
  | 'releases'
  | 'logs'
  | 'bin'
  | 'profile'
  | 'reminders';

type TutorialActionType = 'next' | 'previous' | 'navigate' | 'close';

type TutorialAction = {
  type: TutorialActionType;
  path?: string;
  stepIndex?: number;
};

type TutorialStepConfig = {
  element: string;
  title: string;
  description: string;
  nextAction?: TutorialAction;
  prevAction?: TutorialAction;
};

type TutorialDefinition = {
  routeKey: TutorialRouteKey;
  steps: TutorialStepConfig[];
};

type TutorialContext = {
  pathname: string;
};

type PendingTutorialState = {
  path: string;
  stepIndex: number;
};

const TUTORIAL_PENDING_KEY = 'taskflow_pending_tutorial';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

const routeRegistry: Record<TutorialRouteKey, (context: TutorialContext) => TutorialDefinition> = {
  home: () => ({
    routeKey: 'home',
    steps: [
      {
        element: '#task-filters',
        title: 'Filter Tasks',
        description: 'Use these filters to narrow the workspace by status, repository, tags, and deployment state.',
      },
      {
        element: '#view-mode-toggle',
        title: 'Change View Mode',
        description: 'Switch between the task layouts and supporting controls without leaving the page.',
      },
      {
        element: '#header-workspace-trigger',
        title: 'Workspace Switcher',
        description: 'Use this workspace button to switch companies, add a new workspace, or manage the current set of companies.',
      },
      {
        element: '#header-inbox-trigger',
        title: 'Inbox',
        description: 'The inbox collects notifications, support updates, and cloud activity. In local mode it also explains that sign-in is required for live notification sync.',
      },
      {
        element: '#header-reminders-trigger',
        title: 'General Reminders',
        description: 'Open your general reminders from here to track workspace-wide notes and important follow-ups outside individual tasks.',
      },
      {
        element: '#header-theme-toggle',
        title: 'Switch Themes',
        description: 'Switch between light and dark modes to match your comfort and viewing preference.',
      },
      {
        element: '#header-profile-trigger',
        title: 'Profile And Sign-In',
        description: 'This tutorial opens the profile menu for you here. Use it to access My Profile, Settings, and Help & About, and in local mode you will also see Sign In / Cloud Sync.',
      },
      {
        element: '#floating-notes-trigger',
        title: 'Notes',
        description: 'Use the floating notes button to quickly create a note or jump into the full notes workspace while staying on the tasks page.',
      },
      {
        element: '#global-search-option',
        title: 'Spotlight Search',
        description: 'Open the global search (`CMD+K`/`Ctrl+K`) overlay to jump across tasks, notes, settings, and key app destinations from anywhere.',
      },
      {
        element: '#home-export-trigger',
        title: 'Export Tasks',
        description: 'Use Export to download the current filtered view or the full task list. When your workspace has tasks, this is the fastest way to back up or share them.',
      },
      {
        element: '#home-import-trigger',
        title: 'Import Tasks',
        description: 'Import brings tasks in from a JSON file, and the template download helps you prepare imports in the expected format.',
      },
      {
        element: '#home-select-multiple-trigger',
        title: 'Select Multiple',
        description: 'Turn on multi-select from here to manage tasks in bulk. The tutorial will open the bulk actions bar for the next steps.',
      },
      {
        element: '#select-all-tasks',
        title: 'Select All',
        description: 'Use Select All to pick every task in the current filtered view at once.',
      },
      {
        element: '#bulk-tags-trigger',
        title: 'Bulk Tags',
        description: 'Apply one or more tags to all selected tasks from this bulk action.',
      },
      {
        element: '#bulk-copy-trigger',
        title: 'Bulk Copy',
        description: 'Copy the selected tasks as formatted text when you need to share or paste them somewhere else.',
      },
      {
        element: '#bulk-pdf-trigger',
        title: 'Bulk PDF',
        description: 'Export the selected tasks into a PDF document from this action.',
      },
      {
        element: '#bulk-delete-trigger',
        title: 'Bulk Delete',
        description: 'Move the selected tasks to the bin from here when you want to clean up in bulk.',
      },
      {
        element: '#new-task-btn',
        title: 'Create a Task',
        description: 'Start a new task from here, then continue the tour inside the task form.',
        nextAction: { type: 'navigate', path: '/tasks/new', stepIndex: 0 },
      },
    ],
  }),
  'task-new': () => ({
    routeKey: 'task-new',
    steps: [
      {
        element: '#task-form-main-card',
        title: 'Task Form',
        description: 'This form groups the active field configuration into sections so new tasks stay aligned with workspace settings.',
        prevAction: { type: 'navigate', path: '/', stepIndex: 15 },
      },
      {
        element: '#task-form-submit',
        title: 'Save the Task',
        description: 'Use this action to create the task once the required fields are complete.',
      },
    ],
  }),
  'task-detail': ({ pathname }) => ({
    routeKey: 'task-detail',
    steps: [
      {
        element: '#task-detail-main',
        title: 'Task Overview',
        description: 'This page is the main operating view for a task, including status, description, reminders, and linked work.',
      },
      {
        element: '#task-detail-edit',
        title: 'Edit the Task',
        description: 'Open the full edit form when the task needs broader changes than quick inline updates.',
        nextAction: { type: 'navigate', path: `${pathname}/edit`, stepIndex: 0 },
      },
    ],
  }),
  'task-edit': ({ pathname }) => ({
    routeKey: 'task-edit',
    steps: [
      {
        element: '#task-form-main-card',
        title: 'Edit Form',
        description: 'This form reuses the same grouped field layout as task creation, but starts from the current task values.',
        prevAction: { type: 'navigate', path: pathname.replace(/\/edit$/, ''), stepIndex: 2 },
      },
      {
        element: '#task-form-submit',
        title: 'Save Changes',
        description: 'Save the updated task from here when you finish editing.',
      },
    ],
  }),
  notes: () => ({
    routeKey: 'notes',
    steps: [
      {
        element: '#notes-page',
        title: 'Notes Workspace',
        description: 'Use notes for lightweight documentation, meeting points, or quick references tied to your workflow.',
      },
      {
        element: '#notes-toolbar',
        title: 'Notes Actions',
        description: 'Create, import, export, and bulk-manage notes from this toolbar.',
      },
      {
        element: '#notes-search',
        title: 'Search Notes',
        description: 'Search note titles and content, then combine that with date filtering when needed.',
      },
      {
        element: '#notes-grid',
        title: 'Notes Grid',
        description: 'Your saved notes appear here, and the desktop layout can be rearranged by dragging cards.',
      },
      {
        element: '#notes-new-note',
        title: 'Create a New Note',
        description: 'Start a dedicated note creation flow from here.',
        nextAction: { type: 'navigate', path: '/notes/new', stepIndex: 0 },
      },
    ],
  }),
  'note-new': () => ({
    routeKey: 'note-new',
    steps: [
      {
        element: '#note-form-page',
        title: 'Create Note',
        description: 'Use the page form to capture longer note content with formatting support.',
        prevAction: { type: 'navigate', path: '/notes', stepIndex: 4 },
      },
      {
        element: '#note-form-submit',
        title: 'Save Note',
        description: 'Create the note from here when the title and content are ready.',
      },
    ],
  }),
  'note-detail': () => ({
    routeKey: 'note-detail',
    steps: [
      {
        element: '#note-detail-page',
        title: 'Note Detail',
        description: 'This page shows the full note content in a dedicated reading view.',
      },
      {
        element: '#note-detail-copy',
        title: 'Quick Actions',
        description: 'Copy, share, edit, or delete the note from the detail view actions.',
      },
    ],
  }),
  dashboard: () => ({
    routeKey: 'dashboard',
    steps: [
      {
        element: '#dashboard-page',
        title: 'Dashboard',
        description: 'The dashboard summarizes task throughput, ownership, repositories, and deployment activity.',
      },
    ],
  }),
  insights: () => ({
    routeKey: 'insights',
    steps: [
      {
        element: '#insights-added',
        title: 'Recently Added',
        description: 'This section focuses on tasks created recently in the active workspace.',
      },
      {
        element: '#insights-imported',
        title: 'Recently Imported',
        description: 'This section isolates tasks that arrived through imports so they are easy to review separately.',
      },
    ],
  }),
  settings: () => ({
    routeKey: 'settings',
    steps: [
      {
        element: '#settings-field-config-card',
        title: 'Field Configuration',
        description: 'Manage which task fields exist, how they behave, and whether they are active in the workspace.',
      },
      {
        element: '#add-field-button',
        title: 'Add Fields',
        description: 'Create new custom fields here when your workflow needs more structure.',
      },
      {
        element: '#settings-storage-card',
        title: 'Storage Mode',
        description: 'Choose whether the workspace runs in local-only mode or cloud sync mode.',
      },
      {
        element: '#settings-appearance-card',
        title: 'Appearance',
        description: 'Customize the workspace theme, name, and branding from this section.',
      },
      {
        element: '#settings-display-save',
        title: 'Save Display Settings',
        description: 'Apply your updated workspace icon, theme, and branding changes with this action.',
      },
      {
        element: '#settings-install-card',
        title: 'App Installation',
        description: 'This section explains how to install the workspace as an app on the current device.',
      },
      {
        element: '#settings-features-card',
        title: 'Feature Controls',
        description: 'Enable or disable reminders, onboarding, and related workspace features here.',
      },
      {
        element: '#settings-team-card',
        title: 'Team Management',
        description: 'Manage developers, testers, and supporting people lists from this section.',
      },
      {
        element: '#settings-environment-card',
        title: 'Environments',
        description: 'Configure deployment environments and other release-related structure here.',
      },
      {
        element: '#settings-data-card',
        title: 'Data Management',
        description: 'Export, import, or clear workspace data from this administration area.',
      },
      {
        element: '#release-management-card',
        title: 'Release Management',
        description: 'Publish or maintain release notes from the dedicated release management area.',
      },
    ],
  }),
  releases: () => ({
    routeKey: 'releases',
    steps: [
      {
        element: '#releases-page',
        title: 'Release History',
        description: 'Published product updates are organized here so the team can track features, improvements, and fixes.',
      },
    ],
  }),
  logs: () => ({
    routeKey: 'logs',
    steps: [
      {
        element: '#logs-page',
        title: 'Activity Logs',
        description: 'Use logs to inspect an audit trail of changes across tasks, notes, and settings.',
      },
      {
        element: '#logs-search',
        title: 'Search Logs',
        description: 'Search by message or actor to narrow the activity history quickly.',
      },
    ],
  }),
  bin: () => ({
    routeKey: 'bin',
    steps: [
      {
        element: '#bin-page',
        title: 'Deleted Items Bin',
        description: 'Recently deleted tasks and note-backed items are held here until restored or permanently removed.',
      },
    ],
  }),
  profile: () => ({
    routeKey: 'profile',
    steps: [
      {
        element: '#profile-page',
        title: 'Profile',
        description: 'Manage personal details, security settings, and administrative workspace controls from this page.',
      },
      {
        element: '#profile-tabs',
        title: 'Profile Sections',
        description: 'Switch between general, security, and admin areas using these tabs.',
      },
    ],
  }),
  reminders: () => ({
    routeKey: 'reminders',
    steps: [
      {
        element: '#reminders-page',
        title: 'General Reminders',
        description: 'Use general reminders as workspace-wide notes that are visible outside of individual tasks.',
      },
      {
        element: '#reminders-list',
        title: 'Reminder List',
        description: 'Existing reminders can be edited or deleted from this list.',
      },
    ],
  }),
};

function getRouteKey(path: string): TutorialRouteKey | null {
  if (path === '/') return 'home';
  if (path === '/tasks/new') return 'task-new';
  if (/^\/tasks\/[^/]+\/edit$/.test(path)) return 'task-edit';
  if (/^\/tasks\/[^/]+$/.test(path)) return 'task-detail';
  if (path === '/notes') return 'notes';
  if (path === '/notes/new') return 'note-new';
  if (/^\/notes\/[^/]+$/.test(path)) return 'note-detail';
  if (path === '/dashboard') return 'dashboard';
  if (path === '/insights') return 'insights';
  if (path === '/settings') return 'settings';
  if (path === '/releases') return 'releases';
  if (path === '/logs') return 'logs';
  if (path === '/bin') return 'bin';
  if (path === '/profile') return 'profile';
  if (path === '/reminders') return 'reminders';
  return null;
}

function getPendingTutorialState(): PendingTutorialState | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(TUTORIAL_PENDING_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingTutorialState;
  } catch {
    sessionStorage.removeItem(TUTORIAL_PENDING_KEY);
    return null;
  }
}

function setPendingTutorialState(state: PendingTutorialState) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TUTORIAL_PENDING_KEY, JSON.stringify(state));
}

function clearPendingTutorialState() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TUTORIAL_PENDING_KEY);
}

function isDesktopViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getFallbackStep(description: string): DriveStep {
  return {
    element: '#main-header',
    popover: {
      title: 'Tutorial',
      description,
    },
  };
}

export function useTutorial() {
  const router = useRouter();
  const pathname = usePathname();
  const { prompt } = useUnsavedChanges();
  const driverRef = React.useRef<Driver | null>(null);
  const scrollRafRef = React.useRef<number | null>(null);

  const destroyTutorial = React.useCallback(() => {
    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const scrollElementToTop = React.useCallback((element: Element | undefined, driverInstance?: Driver, behavior: ScrollBehavior = 'smooth') => {
    if (!element || typeof window === 'undefined') {
      return;
    }

    const topOffset = 96;
    const rect = element.getBoundingClientRect();
    const targetTop = Math.max(window.scrollY + rect.top - topOffset, 0);

    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: targetTop,
        behavior,
      });

      if (driverInstance) {
        window.setTimeout(() => {
          driverInstance.refresh();
        }, behavior === 'smooth' ? 260 : 0);
      }
    });
  }, []);

  const waitForElement = React.useCallback(async (selector: string, timeout = 4000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }

    return null;
  }, []);

  const waitForAnyElement = React.useCallback(async (selectors: string[], timeout = 4000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      }
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }

    return null;
  }, []);

  const handleAction = React.useCallback((action: TutorialAction | undefined, fallback: () => void) => {
    if (!action) {
      fallback();
      return;
    }

    if (action.type === 'next') {
      driverRef.current?.moveNext();
      return;
    }

    if (action.type === 'previous') {
      driverRef.current?.movePrevious();
      return;
    }

    if (action.type === 'close') {
      destroyTutorial();
      return;
    }

    if (action.type === 'navigate' && action.path) {
      destroyTutorial();
      prompt(() => {
        setPendingTutorialState({ path: action.path!, stepIndex: action.stepIndex ?? 0 });
        window.dispatchEvent(new Event('navigation-start'));
        router.push(action.path!);
      });
      return;
    }

    fallback();
  }, [destroyTutorial, prompt, router]);

  const buildDriverSteps = React.useCallback((steps: TutorialStepConfig[]): DriveStep[] => {
    return steps.map((step) => {
      const onNextClick: DriverHook = (_element, _step, opts) => {
        handleAction(step.nextAction, () => opts.driver.moveNext());
      };

      const onPrevClick: DriverHook = (_element, _step, opts) => {
        handleAction(step.prevAction, () => opts.driver.movePrevious());
      };

      return {
        element: step.element,
        onHighlighted: (element, _step, opts) => {
          scrollElementToTop(element, opts.driver, 'smooth');
        },
        popover: {
          title: step.title,
          description: step.description,
          onNextClick,
          onPrevClick,
        },
      };
    });
  }, [handleAction, scrollElementToTop]);

  const startDriver = React.useCallback((steps: DriveStep[], initialStep = 0) => {
    destroyTutorial();

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      smoothScroll: false,
      popoverClass: 'taskflow-driver-popover',
      onPopoverRender: (popover) => {
        applyTutorialPopoverTheme(popover);
      },
      steps,
      onCloseClick: () => {
        prompt(() => {
          destroyTutorial();
        });
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(initialStep);
  }, [destroyTutorial, prompt]);

  const startTutorialForPath = React.useCallback(async (path: string, initialStep = 0) => {
    const routeKey = getRouteKey(path);

    if (!routeKey) {
      startDriver([getFallbackStep('There is no guided tutorial available for this page yet.')], 0);
      return;
    }

    if (!isDesktopViewport()) {
      startDriver([getFallbackStep('This tutorial is currently optimized for desktop layouts.')], 0);
      return;
    }

    const definition = routeRegistry[routeKey]({ pathname: path });
    const selectors = definition.steps.map(step => step.element);

    const readyRouteElement = await waitForAnyElement(selectors, 4000);
    if (!readyRouteElement) {
      startDriver([getFallbackStep('Tutorial targets were not ready on this page. Please try again.')], 0);
      return;
    }

    const stepsWithIndex = definition.steps.map((step, index) => ({ step, index }));
    const validSteps: Array<{ step: TutorialStepConfig; index: number }> = [];

    for (const item of stepsWithIndex) {
      const exists = document.querySelector(item.step.element);
      if (exists) {
        validSteps.push(item);
      }
    }

    if (validSteps.length === 0) {
      startDriver([getFallbackStep('This page does not currently expose any tutorial anchors.')], 0);
      return;
    }

    const mappedInitialIndex = validSteps.findIndex(item => item.index >= initialStep);
    const startIndex = mappedInitialIndex >= 0 ? mappedInitialIndex : 0;
    const startingSelector = validSteps[startIndex]?.step.element;

    if (startingSelector) {
      const readyElement = await waitForElement(startingSelector, 4000);
      if (!readyElement) {
        startDriver([getFallbackStep('Tutorial targets were not ready on this page. Please try again.')], 0);
        return;
      }
    }

    startDriver(buildDriverSteps(validSteps.map(item => item.step)), startIndex);
  }, [buildDriverSteps, startDriver, waitForAnyElement, waitForElement]);

  React.useEffect(() => {
    const pending = getPendingTutorialState();
    if (!pending || pending.path !== pathname) {
      return;
    }

    clearPendingTutorialState();
    void startTutorialForPath(pathname, pending.stepIndex);
  }, [pathname, startTutorialForPath]);

  React.useEffect(() => {
    return () => {
      destroyTutorial();
    };
  }, [destroyTutorial]);

  const startTutorial = React.useCallback(() => {
    const config = getUiConfig();
    if (!config.tutorialEnabled) {
      return;
    }

    void startTutorialForPath(pathname, 0);
  }, [pathname, startTutorialForPath]);

  return { startTutorial };
}
