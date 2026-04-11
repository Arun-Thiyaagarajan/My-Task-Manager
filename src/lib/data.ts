'use client';

import { INITIAL_RELEASES, INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES, DEFAULT_STATUS_CONFIGS, DEFAULT_STATUS_GROUPS } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log, Comment, GeneralReminder, BackupFrequency, Note, NoteLayout, Environment, ReleaseUpdate, ReleaseItem, AuthMode, UserPreferences, LocalProfile, Feedback, FeedbackMessage, FeedbackStatus, UserProfile, AppNotification, StatusConfigItem, TaskTemplate, RepositoryConfig, SavedTaskView, StarterContentMeta } from './types'; 
import cloneDeep from 'lodash/cloneDeep';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, collection, writeBatch, getDocs, query, orderBy, limit, getDoc, where, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';
import { syncTaskStatuses } from './status-config';
import { createId } from './id';
import { buildReadCacheScope, clearAllReadCache, invalidateNoteReadCache, invalidateTaskReadCache } from './read-cache';
import { formatTimestamp } from './utils';
import { getDueReminderPresetLabel, getTaskPriorityLabel } from './task-planning';

export const DATA_KEY = 'my_task_manager_data';
const AUTH_MODE_KEY = 'taskflow_auth_mode';
const PREFERENCES_KEY = 'taskflow_user_preferences';
const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
const SHARED_RELEASE_UPDATES_COLLECTION = 'shared';
const SHARED_RELEASE_UPDATES_DOC = 'release-updates';

function isQuotaExceededError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as DOMException & { code?: number };
    return (
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014
    );
}

function getSerializedSizeBytes(value: unknown): number {
    if (typeof window === 'undefined') return 0;
    const serialized = JSON.stringify(value);
    return new TextEncoder().encode(serialized).length;
}

function isLikelyMobileStorageContext(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || window.innerWidth < 768;
}

function getQuotaExceededMessage() {
    return isLikelyMobileStorageContext()
        ? 'This import is too large for mobile local storage. Please use cloud mode or import a smaller file.'
        : 'Local storage is full. Please clear unused tasks, notes, logs, or switch to cloud mode before importing this file.';
}

async function assertLocalImportCapacity(nextData: MyTaskManagerData) {
    if (typeof window === 'undefined' || getAuthMode() === 'authenticate') return;

    const estimatedBytes = getSerializedSizeBytes(nextData);
    const mobileSoftLimit = 3.5 * 1024 * 1024;

    if (isLikelyMobileStorageContext() && estimatedBytes > mobileSoftLimit) {
        throw new Error(getQuotaExceededMessage());
    }

    if (navigator.storage?.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            if (estimate.quota && estimate.usage) {
                const remaining = estimate.quota - estimate.usage;
                const safetyBuffer = 512 * 1024;
                if (estimatedBytes > Math.max(remaining - safetyBuffer, 0)) {
                    throw new Error(getQuotaExceededMessage());
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
        }
    }
}

// Central In-Memory Cache for Real-time Cloud Data
let _cloudCache: MyTaskManagerData | null = null;
let _initialSyncStatus: Record<string, boolean> = {}; // companyId -> status

function sanitizeForFirestore<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .map(item => sanitizeForFirestore(item))
            .filter(item => typeof item !== 'undefined') as T;
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, entryValue]) => typeof entryValue !== 'undefined')
            .map(([key, entryValue]) => [key, sanitizeForFirestore(entryValue)]);

        return Object.fromEntries(entries) as T;
    }

    return value;
}

export function setCloudCache(data: MyTaskManagerData | null) {
    _cloudCache = data;
}

export function isInitialSyncComplete(companyId: string): boolean {
    if (typeof window === 'undefined') return false;
    if (getAuthMode() !== 'authenticate') return true;
    if (!companyId) return false;
    return _initialSyncStatus[companyId] || false;
}

export function markInitialSyncComplete(companyId: string) {
    if (typeof window === 'undefined') return;
    _initialSyncStatus[companyId] = true;
    window.dispatchEvent(new Event('sync-complete'));
}

export function resetInitialSyncStatus() {
    _initialSyncStatus = {};
}

const getEmptyAppData = (): MyTaskManagerData => ({
    companies: [],
    activeCompanyId: '',
    companyData: {},
    notifications: [],
    localProfile: { username: 'Guest User', photoURL: null, previousPhotoURL: null },
});

function buildStarterSavedTaskViews(now: string): SavedTaskView[] {
    return [
        {
            id: createId('starter-view-'),
            name: 'Active Tasks',
            createdAt: now,
            updatedAt: now,
            pinned: true,
            state: {
                viewMode: 'grid',
                sortDescriptor: 'status-asc',
                dateView: 'all',
                favoritesOnly: false,
                openGroups: ['active', 'testing'],
                searchQuery: '',
                filters: {
                    status: ['In Progress', 'Code Review', 'QA'],
                    statusGroup: [],
                    repo: [],
                    deployment: [],
                    tags: [],
                    priority: [],
                    dueState: [],
                    reminderNote: [],
                    dueReminder: [],
                },
            },
        },
        {
            id: createId('starter-view-'),
            name: 'This Month',
            createdAt: now,
            updatedAt: now,
            pinned: true,
            state: {
                viewMode: 'grid',
                sortDescriptor: 'start-asc',
                dateView: 'monthly',
                favoritesOnly: false,
                openGroups: ['backlog', 'active'],
                searchQuery: '',
                selectedDate: new Date(now).toISOString(),
                filters: {
                    status: [],
                    statusGroup: [],
                    repo: [],
                    deployment: [],
                    tags: [],
                    priority: [],
                    dueState: [],
                    reminderNote: [],
                    dueReminder: [],
                },
            },
        },
        {
            id: createId('starter-view-'),
            name: 'Testing Focus',
            createdAt: now,
            updatedAt: now,
            pinned: false,
            state: {
                viewMode: 'table',
                sortDescriptor: 'updated-desc',
                dateView: 'all',
                favoritesOnly: false,
                openGroups: ['testing'],
                searchQuery: '',
                filters: {
                    status: ['QA'],
                    statusGroup: ['testing'],
                    repo: [],
                    deployment: [],
                    tags: [],
                    priority: [],
                    dueState: [],
                    reminderNote: [],
                    dueReminder: [],
                },
            },
        },
    ];
}

function buildStarterCompanyData(companyName: string): CompanyData {
    const now = new Date();
    const nowIso = now.toISOString();
    const tomorrowIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const threeDaysIso = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const nextWeekIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const starterRepositories: RepositoryConfig[] = [
        {
            id: createId('starter-repo-'),
            name: 'UI-Dashboard',
            baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/UI-Dashboard/pullrequest/',
        },
        {
            id: createId('starter-repo-'),
            name: 'API-Platform',
            baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/API-Platform/pullrequest/',
        },
        {
            id: createId('starter-repo-'),
            name: 'Templates',
            baseUrl: 'https://dev.azure.com/ideaelan/Infinity/_git/Templates/pullrequest/',
        },
    ];
    const starterDevelopers: Person[] = [
        {
            id: createId('starter-dev-'),
            name: 'Aarav Dev',
            email: 'aarav.dev@taskflow.app',
        },
        {
            id: createId('starter-dev-'),
            name: 'Meera Frontend',
            email: 'meera.frontend@taskflow.app',
        },
    ];
    const starterTesters: Person[] = [
        {
            id: createId('starter-tester-'),
            name: 'Riya QA',
            email: 'riya.qa@taskflow.app',
        },
        {
            id: createId('starter-tester-'),
            name: 'Kabir TestOps',
            email: 'kabir.testops@taskflow.app',
        },
    ];
    const starterDeveloperIds = starterDevelopers.map((developer) => developer.id);
    const starterTesterIds = starterTesters.map((tester) => tester.id);

    const starterTasks: Task[] = [
        {
            id: createId('starter-task-'),
            title: 'Plan the next release checklist',
            description: 'Use this sample task to see status changes, reminders, tags, and saved views working together.',
            summary: 'Sample backlog task for release planning.',
            status: 'To Do',
            createdAt: nowIso,
            updatedAt: nowIso,
            tags: ['planning', 'sample'],
            repositories: ['UI-Dashboard', 'Templates'],
            developers: [starterDevelopers[0].id],
            testers: [starterTesters[0].id],
            azureWorkItemId: '8421',
            prLinks: {
                dev: {
                    'UI-Dashboard': '412',
                    Templates: '91',
                },
            },
            deploymentStatus: { dev: false, stage: false, production: false },
            comments: [
                {
                    text: 'Kickoff note: review the saved views, open groups, and monthly planning flow after you tour the sample workspace.',
                    timestamp: nowIso,
                },
            ],
            attachments: [
                {
                    name: 'Release checklist brief',
                    url: 'https://example.com/release-checklist',
                    type: 'link',
                    uploadedAt: nowIso,
                },
            ],
            reminder: 'Review priorities before the next sprint starts.',
            reminderExpiresAt: tomorrowIso,
            devStartDate: tomorrowIso,
            relevantEnvironments: ['dev', 'stage', 'production'],
        },
        {
            id: createId('starter-task-'),
            title: 'Polish the mobile filter drawer',
            description: 'This sample task shows an in-progress workflow item with deployment tracking and ownership.',
            summary: 'Example in-progress item for mobile UX work.',
            status: 'In Progress',
            createdAt: nowIso,
            updatedAt: nowIso,
            tags: ['mobile', 'ux'],
            repositories: ['UI-Dashboard', 'API-Platform'],
            developers: [starterDevelopers[1].id],
            testers: [starterTesters[0].id],
            azureWorkItemId: '8457',
            prLinks: {
                dev: {
                    'UI-Dashboard': '428',
                    'API-Platform': '233',
                },
                stage: {
                    'UI-Dashboard': '428',
                },
            },
            relevantEnvironments: ['dev', 'stage'],
            deploymentStatus: { dev: true, stage: false, production: false },
            deploymentDates: { dev: nowIso },
            comments: [
                {
                    text: 'The mobile drawer now keeps draft filters. Next pass is smoothing the transition between grid and calendar.',
                    timestamp: nowIso,
                },
            ],
            attachments: [
                {
                    name: 'Mobile filter polish spec',
                    url: 'https://example.com/mobile-filter-spec',
                    type: 'link',
                    uploadedAt: nowIso,
                },
            ],
            devStartDate: nowIso,
            qaStartDate: threeDaysIso,
        },
        {
            id: createId('starter-task-'),
            title: 'Review saved view interactions',
            description: 'Use this example to see how grouped statuses and saved views behave in review.',
            summary: 'Sample code review item.',
            status: 'Code Review',
            createdAt: nowIso,
            updatedAt: nowIso,
            tags: ['saved-views', 'review'],
            repositories: ['UI-Dashboard'],
            developers: starterDeveloperIds,
            testers: [starterTesters[1].id],
            azureWorkItemId: '8484',
            prLinks: {
                dev: {
                    'UI-Dashboard': '437',
                },
            },
            comments: [
                {
                    text: 'Check that the active saved view highlight and clear action feel obvious before merging.',
                    timestamp: threeDaysIso,
                },
            ],
            relevantEnvironments: ['dev', 'stage'],
            devStartDate: nowIso,
            devEndDate: threeDaysIso,
        },
        {
            id: createId('starter-task-'),
            title: 'Validate release notes popup on mobile',
            description: 'A QA sample task to demonstrate testing-focused saved views and date-based planning.',
            summary: 'Sample QA-ready task.',
            status: 'QA',
            createdAt: nowIso,
            updatedAt: nowIso,
            tags: ['qa', 'release'],
            repositories: ['UI-Dashboard', 'API-Platform'],
            developers: [starterDevelopers[0].id],
            testers: starterTesterIds,
            azureWorkItemId: '8510',
            prLinks: {
                stage: {
                    'UI-Dashboard': '441',
                    'API-Platform': '238',
                },
                production: {
                    'UI-Dashboard': '441',
                },
            },
            relevantEnvironments: ['stage', 'production'],
            deploymentStatus: { dev: true, stage: true, production: false },
            deploymentDates: { dev: nowIso, stage: threeDaysIso },
            comments: [
                {
                    text: 'Please verify the new release popup on both desktop refresh and mobile reopen flows.',
                    timestamp: nextWeekIso,
                },
            ],
            attachments: [
                {
                    name: 'Release notes capture',
                    url: 'https://example.com/release-notes-mobile',
                    type: 'link',
                    uploadedAt: threeDaysIso,
                },
            ],
            qaStartDate: threeDaysIso,
            qaEndDate: nextWeekIso,
        },
    ];

    const starterNotes: Note[] = [
        {
            id: createId('starter-note-'),
            title: 'Welcome to your workspace',
            content: `This starter workspace helps you explore ${companyName || 'TaskFlow'} quickly.\n\nTry opening saved views, editing sample tasks, and resetting layouts from Settings when you are ready.`,
            createdAt: nowIso,
            updatedAt: nowIso,
            layout: { i: '', x: 0, y: 0, w: 4, h: 4 },
        },
        {
            id: createId('starter-note-'),
            title: 'Good first customizations',
            content: '1. Rename your app in Settings.\n2. Add your environments and repositories.\n3. Save your favorite filtered task views.',
            createdAt: nowIso,
            updatedAt: nowIso,
            layout: { i: '', x: 4, y: 0, w: 4, h: 4 },
        },
        {
            id: createId('starter-note-'),
            title: 'Starter content can be removed',
            content: 'If you want a clean slate, open Settings and use the one-time option to remove only the starter tasks, notes, templates, and saved views.',
            createdAt: nowIso,
            updatedAt: nowIso,
            layout: { i: '', x: 8, y: 0, w: 4, h: 4 },
        },
    ].map((note) => ({
        ...note,
        layout: { ...note.layout, i: note.id },
    }));

    const starterTemplates: TaskTemplate[] = [
        {
            id: createId('starter-template-'),
            name: 'Bug Fix',
            description: 'A simple starting point for product or QA bugs.',
            createdAt: nowIso,
            updatedAt: nowIso,
            taskData: {
                status: 'To Do',
                tags: ['bug'],
                repositories: ['UI-Dashboard'],
                developers: [starterDevelopers[0].id],
                testers: [starterTesters[0].id],
                azureWorkItemId: '9001',
                prLinks: {
                    dev: {
                        'UI-Dashboard': '501',
                    },
                },
                relevantEnvironments: ['dev', 'stage', 'production'],
                summary: 'Starter bug workflow with owners and release path.',
            },
        },
        {
            id: createId('starter-template-'),
            name: 'Feature Enhancement',
            description: 'Starter structure for feature work with planning and QA stages.',
            createdAt: nowIso,
            updatedAt: nowIso,
            taskData: {
                status: 'To Do',
                tags: ['feature'],
                repositories: ['UI-Dashboard', 'API-Platform'],
                developers: starterDeveloperIds,
                testers: [starterTesters[1].id],
                azureWorkItemId: '9008',
                prLinks: {
                    dev: {
                        'UI-Dashboard': '518',
                        'API-Platform': '260',
                    },
                },
                relevantEnvironments: ['dev', 'stage'],
                summary: 'Starter feature flow with frontend, backend, and QA ownership.',
            },
        },
        {
            id: createId('starter-template-'),
            name: 'Release Validation',
            description: 'A first-time template for stage-to-production validation work.',
            createdAt: nowIso,
            updatedAt: nowIso,
            taskData: {
                status: 'QA',
                tags: ['release', 'qa'],
                repositories: ['UI-Dashboard', 'Templates'],
                developers: [starterDevelopers[1].id],
                testers: starterTesterIds,
                azureWorkItemId: '9014',
                prLinks: {
                    stage: {
                        'UI-Dashboard': '530',
                        Templates: '109',
                    },
                },
                relevantEnvironments: ['stage', 'production'],
                summary: 'Starter release checklist with PR and deployment context.',
            },
        },
    ];

    const starterContent: StarterContentMeta = {
        isAvailable: true,
        taskIds: starterTasks.map((task) => task.id),
        noteIds: starterNotes.map((note) => note.id),
        templateIds: starterTemplates.map((template) => template.id),
        developerIds: starterDeveloperIds,
        testerIds: starterTesterIds,
        repositoryIds: starterRepositories.map((repo) => repo.id),
    };

    return {
        tasks: starterTasks,
        trash: [],
        taskTemplates: starterTemplates,
        taskTemplateBin: [],
        developers: starterDevelopers,
        testers: starterTesters,
        notes: starterNotes,
        uiConfig: syncTaskStatuses({
            fields: INITIAL_UI_CONFIG.map((f) => {
                if (f.key === 'status') {
                    return { ...f, options: TASK_STATUSES.map((s) => ({ id: s, value: s, label: s })) };
                }
                if (f.key === 'repositories') {
                    return {
                        ...f,
                        options: starterRepositories.map((repository) => ({
                            id: repository.id,
                            value: repository.name,
                            label: repository.name,
                        })),
                        defaultValue: ['UI-Dashboard'],
                    };
                }
                if (f.key === 'developers') {
                    return {
                        ...f,
                        options: starterDevelopers.map((developer) => ({
                            id: developer.id,
                            value: developer.id,
                            label: developer.name,
                        })),
                        defaultValue: [starterDevelopers[0].id],
                    };
                }
                if (f.key === 'testers') {
                    return {
                        ...f,
                        options: starterTesters.map((tester) => ({
                            id: tester.id,
                            value: tester.id,
                            label: tester.name,
                        })),
                        defaultValue: [starterTesters[0].id],
                    };
                }
                if (f.key === 'azureWorkItemId') {
                    return { ...f, defaultValue: '9000' };
                }
                if (f.key === 'tags') {
                    return { ...f, defaultValue: ['sample', 'starter'] };
                }
                if (f.key === 'relevantEnvironments') {
                    return {
                        ...f,
                        options: ENVIRONMENTS.map((e) => ({ id: e.id, value: e.name, label: e.name })),
                        defaultValue: ['dev', 'stage'],
                    };
                }
                return f;
            }),
            environments: [...ENVIRONMENTS],
            repositoryConfigs: starterRepositories,
            taskStatuses: [...TASK_STATUSES],
            statusGroups: [...DEFAULT_STATUS_GROUPS],
            statusConfigs: [...DEFAULT_STATUS_CONFIGS],
            appName: 'TaskFlow',
            appIcon: null,
            remindersEnabled: true,
            tutorialEnabled: true,
            aiAssistantEnabled: true,
            timeFormat: '12h',
            autoBackupFrequency: 'weekly',
            autoBackupTime: 6,
            currentVersion: '1.1.0',
            authenticationMode: 'localStorage',
        }),
        logs: [],
        generalReminders: [],
        releaseUpdates: [...INITIAL_RELEASES],
        starterContent,
    };
}

function buildInitialUserPreferences(): UserPreferences {
    const appData = getAppData();
    const companyId = appData.activeCompanyId;
    const starterMeta = companyId ? appData.companyData[companyId]?.starterContent : null;

    if (!starterMeta?.isAvailable) {
        return { starterContentAvailable: false, starterSavedTaskViewIds: [] };
    }

    const now = new Date().toISOString();
    const starterViews = buildStarterSavedTaskViews(now);

    return {
        savedTaskViews: starterViews,
        starterSavedTaskViewIds: starterViews.map((view) => view.id),
        starterContentAvailable: true,
        starterHomeCalloutSeen: false,
        starterSettingsCleanupSeen: false,
        seenReleaseInboxKeys: {},
    };
}

const getInitialData = (): MyTaskManagerData => {
    const defaultCompanyId = `company-default`;

    return {
        companies: [{ id: defaultCompanyId, name: 'Default Company' }],
        activeCompanyId: defaultCompanyId,
        companyData: {
             [defaultCompanyId]: buildStarterCompanyData('Default Company'),
        },
        notifications: [],
        localProfile: { username: 'Guest User', photoURL: null, previousPhotoURL: null },
    };
};

export const getAppData = (): MyTaskManagerData => {
    const authMode = getAuthMode();
    if (authMode === 'authenticate') {
        if (_cloudCache) {
            return _cloudCache;
        }
        return getEmptyAppData();
    }
    
    if (typeof window === 'undefined') return getInitialData();
    const stored = window.localStorage.getItem(DATA_KEY);
    if (!stored) {
        const initialData = getInitialData();
        window.localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
        return initialData;
    }
    try {
        return JSON.parse(stored);
    } catch (e) {
        const initialData = getInitialData();
        window.localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
        return initialData;
    }
};

export const setAppData = (data: MyTaskManagerData) => {
    if (typeof window === 'undefined') return;
    if (getAuthMode() === 'authenticate') {
        _cloudCache = data;
    } else {
        try {
            window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
        } catch (error) {
            if (isQuotaExceededError(error)) {
                throw new Error(getQuotaExceededMessage());
            }
            throw error;
        }
    }
    window.dispatchEvent(new StorageEvent('storage', { key: DATA_KEY }));
};

export function getAuthMode(): AuthMode {
    if (typeof window === 'undefined') return 'localStorage';
    return (window.localStorage.getItem(AUTH_MODE_KEY) as AuthMode) || 'localStorage';
}

export function setAuthMode(mode: AuthMode) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUTH_MODE_KEY, mode);
    setCloudCache(null);
    resetInitialSyncStatus();
    clearAllReadCache();
    window.dispatchEvent(new Event('company-changed'));
}

function getCurrentReadCacheScopeKey() {
    return buildReadCacheScope(getAuthMode(), getActiveCompanyId());
}

function invalidateCurrentTaskReadCache(taskId?: string) {
    invalidateTaskReadCache(getCurrentReadCacheScopeKey(), taskId);
}

function invalidateCurrentNoteReadCache(noteId?: string) {
    invalidateNoteReadCache(getCurrentReadCacheScopeKey(), noteId);
}

// Local Profile Management
export function getLocalProfile(): LocalProfile {
    return getAppData().localProfile || { username: 'Guest User', photoURL: null, previousPhotoURL: null };
}

export function setLocalProfile(profile: LocalProfile) {
    const data = getAppData();
    data.localProfile = profile;
    setAppData(data);
}

// User Preferences Management
export function getUserPreferences(): UserPreferences {
    if (typeof window === 'undefined') return {};
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    if (!stored) {
        const initialPrefs = buildInitialUserPreferences();
        window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(initialPrefs));
        return initialPrefs;
    }
    try {
        return JSON.parse(stored);
    } catch (e) {
        const initialPrefs = buildInitialUserPreferences();
        window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(initialPrefs));
        return initialPrefs;
    }
}

export async function updateUserPreferences(updates: Partial<UserPreferences>) {
    if (typeof window === 'undefined') return;
    const current = getUserPreferences();
    const next = { ...current, ...updates };
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    
    if (getAuthMode() === 'authenticate') {
        const auth = getAuth();
        const db = getFirestore();
        const userId = auth.currentUser?.uid;
        if (userId) {
            const prefRef = doc(db, 'users', userId, 'preferences', 'settings');
            const sanitizedNext = JSON.parse(JSON.stringify(next));

            setDoc(prefRef, sanitizedNext, { merge: true }).catch(e => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: prefRef.path,
                    operation: 'write',
                    requestResourceData: sanitizedNext
                }));
            });
        }
    }
    window.dispatchEvent(new Event('preferences-changed'));
}

function dispatchMutation(
    type: 'tasks' | 'notes' | 'logs' | 'uiConfig' | 'developers' | 'testers' | 'generalReminders' | 'releaseUpdates' | 'taskTemplates' | 'companies' | 'feedback' | 'feedbackMessages' | 'notifications',
    id: string,
    data: any,
    operation: 'create' | 'update' | 'delete' | 'set',
    parentId?: string
) {
    if (getAuthMode() !== 'authenticate' && (type !== 'feedback' && type !== 'feedbackMessages' && type !== 'notifications')) return;
    const auth = getAuth();
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    const activeCompanyId = getActiveCompanyId();
    
    if (!userId && (type !== 'feedback' && type !== 'feedbackMessages' && type !== 'notifications' && type !== 'releaseUpdates')) return;

    let docRef;
    let payload = data;

    if (type === 'companies') {
        docRef = doc(db, 'users', userId!, 'companies', id);
    } else if (type === 'uiConfig') {
        docRef = doc(db, 'users', userId!, 'companies', activeCompanyId, 'settings', 'uiConfig');
    } else if (type === 'releaseUpdates') {
        docRef = doc(db, SHARED_RELEASE_UPDATES_COLLECTION, SHARED_RELEASE_UPDATES_DOC);
        payload = { list: data };
    } else if (type === 'developers' || type === 'testers' || type === 'generalReminders' || type === 'taskTemplates') {
        const parentMap: Record<string, string> = {
            developers: 'people',
            testers: 'people',
            generalReminders: 'reminders',
            taskTemplates: 'settings',
        };
        const docNameMap: Record<string, string> = {
            developers: 'developers',
            testers: 'testers',
            generalReminders: 'general',
            taskTemplates: 'taskTemplates',
        };
        docRef = doc(db, 'users', userId!, 'companies', activeCompanyId, parentMap[type], docNameMap[type]);
        payload = { list: data };
    } else if (type === 'feedback') {
        docRef = doc(db, 'feedback', id);
    } else if (type === 'feedbackMessages') {
        if (!parentId) return;
        docRef = doc(db, 'feedback', parentId, 'messages', id);
    } else if (type === 'notifications') {
        docRef = doc(db, 'notifications', id);
    } else {
        docRef = doc(db, 'users', userId!, 'companies', activeCompanyId, type, id);
    }

    try {
        const sanitizedPayload = (operation !== 'delete' && payload !== null) 
            ? sanitizeForFirestore(payload)
            : payload;

        const promise = operation === 'delete' ? deleteDoc(docRef) : 
                        operation === 'update' ? updateDoc(docRef, sanitizedPayload) :
                        setDoc(docRef, sanitizedPayload, { merge: operation === 'set' });

        promise.catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef!.path,
                operation: operation === 'set' ? 'write' : operation as any,
                requestResourceData: sanitizedPayload,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    } catch (e) {
        console.error("Mutation dispatch error:", e);
    }
}

// Non-blocking notification creation
export function createNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const auth = getAuth();
    if (!auth.currentUser) return;

    // Standardize: Don't notify the sender themselves
    if (notification.recipientId === auth.currentUser.uid) return;

    const id = createId('notif-');
    const newNotif: AppNotification = {
        ...notification,
        id,
        timestamp: new Date().toISOString(),
        read: false,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email || 'System'
    };
    
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('notifications', id, newNotif, 'set');
    }
}

export function markNotificationRead(id: string) {
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('notifications', id, { read: true }, 'update');
    }
}

export function deleteNotification(id: string) {
    const mode = getAuthMode();
    if (mode === 'authenticate') {
        dispatchMutation('notifications', id, null, 'delete');
    } else {
        const data = getAppData();
        data.notifications = (data.notifications || []).filter(n => n.id !== id);
        setAppData(data);
    }
}

/**
 * Purges notifications older than 24 hours.
 * Runs automatically on app load/sync to keep the inbox clean.
 */
export function purgeExpiredNotifications() {
    const mode = getAuthMode();
    const data = getAppData();
    const notifications = data.notifications || [];
    const auth = getAuth();
    const currentUid = auth.currentUser?.uid;
    if (notifications.length === 0) return;

    const now = new Date();
    // Calculate 24 hours ago
    const threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expired = notifications.filter(n => {
        const ts = n.timestamp ? new Date(n.timestamp) : new Date();
        return ts < threshold;
    });

    if (expired.length === 0) return;

    if (mode === 'authenticate') {
        // Only delete notifications that clearly belong to the signed-in user.
        // This avoids permission errors from stale or malformed cached entries.
        expired.forEach(n => {
            if (!currentUid) return;
            if (n.recipientId !== currentUid) return;
            dispatchMutation('notifications', n.id, null, 'delete');
        });
    } else {
        // Bulk filter and save for local items
        data.notifications = notifications.filter(n => {
            const ts = n.timestamp ? new Date(n.timestamp) : new Date();
            return ts >= threshold;
        });
        setAppData(data);
    }
}

// Company Management
export function getCompanies(): Company[] {
    return getAppData().companies;
}

export function getActiveCompanyId(): string {
    return getAppData().activeCompanyId;
}

export function setActiveCompanyId(id: string) {
    const data = getAppData();
    data.activeCompanyId = id;
    setAppData(data);
}

export function addCompany(name: string) {
    const data = getAppData();
    const id = createId('company-');
    const newCompany = { id, name };
    data.companies.push(newCompany);
    data.companyData[id] = {
        tasks: [],
        trash: [],
        taskTemplates: [],
        taskTemplateBin: [],
        developers: [],
        testers: [],
        notes: [],
        uiConfig: getInitialData().companyData['company-default'].uiConfig,
        logs: [],
        generalReminders: [],
        releaseUpdates: [...INITIAL_RELEASES],
    };
    data.activeCompanyId = id;
    setAppData(data);
    addLog({ message: `Created new company workspace: **${name}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('companies', id, newCompany, 'create');
    }
}

export function updateCompany(id: string, name: string) {
    const data = getAppData();
    const company = data.companies.find(c => c.id === id);
    if (company) {
        const oldName = company.name;
        company.name = name;
        setAppData(data);
        addLog({ message: `Renamed company workspace from **${oldName}** to **${name}**` });
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('companies', id, { name }, 'update');
        }
    }
}

export function deleteCompany(id: string): boolean {
    const data = getAppData();
    if (data.companies.length <= 1) return false;
    const company = data.companies.find(c => c.id === id);
    data.companies = data.companies.filter(c => c.id !== id);
    delete data.companyData[id];
    if (data.activeCompanyId === id) {
        data.activeCompanyId = data.companies[0].id;
    }
    setAppData(data);
    addLog({ message: `Deleted company workspace: **${company?.name || id}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('companies', id, null, 'delete');
    }
    return true;
}

// UI Config
export function getUiConfig(): UiConfig {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const config = data.companyData[companyId]?.uiConfig;
    if (!config) return getInitialData().companyData['company-default'].uiConfig;
    return syncTaskStatuses(config);
}

function mergeImportedFields(
    currentFields: FieldConfig[],
    importedFields: unknown,
    legacyCustomFieldDefinitions: unknown
): FieldConfig[] {
    const nextFields = [...currentFields];
    const byKey = new Map(nextFields.map(field => [field.key, field]));
    const importedFieldList = Array.isArray(importedFields) ? importedFields : [];
    const legacyCustomFields = Array.isArray(legacyCustomFieldDefinitions) ? legacyCustomFieldDefinitions : [];

    importedFieldList.forEach((field: any) => {
        if (!field || typeof field.key !== 'string') return;
        const existing = byKey.get(field.key);
        const mergedField = existing ? { ...existing, ...field } : field;

        if (existing) {
            const index = nextFields.findIndex(item => item.key === field.key);
            nextFields[index] = mergedField;
        } else {
            nextFields.push(mergedField);
        }

        byKey.set(field.key, mergedField);
    });

    legacyCustomFields.forEach((field: any) => {
        if (!field || typeof field.key !== 'string' || byKey.has(field.key)) return;
        nextFields.push(field);
        byKey.set(field.key, field);
    });

    return nextFields
        .filter((field): field is FieldConfig => !!field?.key && !!field?.label && !!field?.type)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function normalizePersonFieldDefaultValueForExport(
    field: FieldConfig,
    people: Person[]
): FieldConfig {
    if (!['developers', 'testers'].includes(field.key)) {
        return field;
    }

    const idToName = new Map(people.map(person => [person.id, person.name]));
    const normalizeValue = (value: unknown) => {
        if (Array.isArray(value)) {
            return value.map(item => {
                if (typeof item !== 'string') return item;
                return idToName.get(item) || item;
            });
        }

        if (typeof value === 'string') {
            return idToName.get(value) || value;
        }

        return value;
    };

    return {
        ...field,
        defaultValue: normalizeValue(field.defaultValue),
    };
}

export function prepareUiFieldsForExport(
    fields: FieldConfig[],
    developers: Person[],
    testers: Person[]
): FieldConfig[] {
    return fields.map(field => {
        if (field.key === 'developers') {
            return normalizePersonFieldDefaultValueForExport(field, developers);
        }

        if (field.key === 'testers') {
            return normalizePersonFieldDefaultValueForExport(field, testers);
        }

        return field;
    });
}

export function prepareUiConfigForExport(
    uiConfig: UiConfig,
    developers: Person[],
    testers: Person[]
): UiConfig {
    const normalized = syncTaskStatuses(uiConfig);

    return {
        ...normalized,
        fields: prepareUiFieldsForExport(normalized.fields, developers, testers),
        statusGroups: normalized.statusGroups || [],
        statusConfigs: normalized.statusConfigs || [],
        taskStatuses: normalized.taskStatuses || [],
    };
}

export function prepareUiFieldsForImport(
    fields: FieldConfig[],
    developers: Person[],
    testers: Person[]
): FieldConfig[] {
    return fields.map(field => {
        if (field.key === 'developers') {
            return normalizeImportedPersonFieldDefaultValue(field, developers);
        }

        if (field.key === 'testers') {
            return normalizeImportedPersonFieldDefaultValue(field, testers);
        }

        return field;
    });
}

function normalizeImportedPersonFieldDefaultValue(
    field: FieldConfig,
    people: Person[]
): FieldConfig {
    if (!['developers', 'testers'].includes(field.key)) {
        return field;
    }

    const nameToId = new Map(people.map(person => [person.name.trim().toLowerCase(), person.id]));
    const validIds = new Set(people.map(person => person.id));

    const normalizeValue = (value: unknown) => {
        if (Array.isArray(value)) {
            return value
                .map(item => {
                    if (typeof item !== 'string') return undefined;
                    if (validIds.has(item)) return item;
                    return nameToId.get(item.trim().toLowerCase());
                })
                .filter((item): item is string => !!item);
        }

        if (typeof value === 'string') {
            if (validIds.has(value)) return value;
            return nameToId.get(value.trim().toLowerCase()) || value;
        }

        return value;
    };

    return {
        ...field,
        defaultValue: normalizeValue(field.defaultValue),
    };
}

function mergeImportedUiConfig(
    currentUi: UiConfig,
    parsedJson: any,
    currentDevelopers: Person[] = [],
    currentTesters: Person[] = []
): UiConfig {
    const mergedRepositoryConfigs = [...currentUi.repositoryConfigs];
    const importedRepositoryConfigs = Array.isArray(parsedJson.repositoryConfigs) ? parsedJson.repositoryConfigs : [];
    importedRepositoryConfigs.forEach((repo: any) => {
        if (!repo?.name || mergedRepositoryConfigs.some(existing => existing.name === repo.name)) return;
        mergedRepositoryConfigs.push({ ...repo, id: repo.id || createId('repo_') });
    });

    const mergedEnvironments = [...currentUi.environments];
    const importedEnvironments = Array.isArray(parsedJson.environments) ? parsedJson.environments : [];
    importedEnvironments.forEach((environment: any) => {
        if (!environment?.name || mergedEnvironments.some(existing => existing.name.toLowerCase() === environment.name.toLowerCase())) return;
        mergedEnvironments.push({ ...environment, id: environment.id || createId('env_') });
    });

    const importedStatusConfigs = Array.isArray(parsedJson.statusConfigs)
        ? parsedJson.statusConfigs.filter((status: any): status is StatusConfigItem => Boolean(status?.name))
        : [];
    const importedTaskStatuses = Array.isArray(parsedJson.taskStatuses)
        ? parsedJson.taskStatuses.filter((status: any): status is string => typeof status === 'string' && status.trim().length > 0)
        : [];

    const mergedFields = mergeImportedFields(
        currentUi.fields,
        parsedJson.fields,
        parsedJson.customFieldDefinitions
    ).map(field => {
        if (field.key === 'repositories') {
            return {
                ...field,
                options: mergedRepositoryConfigs.map(repo => ({ id: repo.id, value: repo.name, label: repo.name })),
            };
        }

        if (field.key === 'relevantEnvironments') {
            return {
                ...field,
                options: mergedEnvironments.map(environment => ({ id: environment.id, value: environment.name, label: environment.name })),
            };
        }

        if (field.key === 'developers') {
            return normalizeImportedPersonFieldDefaultValue(field, currentDevelopers);
        }

        if (field.key === 'testers') {
            return normalizeImportedPersonFieldDefaultValue(field, currentTesters);
        }

        return field;
    });

    return syncTaskStatuses({
        ...currentUi,
        appName: parsedJson.appName || currentUi.appName,
        appIcon: typeof parsedJson.appIcon !== 'undefined' ? parsedJson.appIcon : currentUi.appIcon,
        timeFormat: parsedJson.timeFormat || currentUi.timeFormat,
        fields: mergedFields,
        repositoryConfigs: mergedRepositoryConfigs,
        environments: mergedEnvironments,
        statusGroups: Array.isArray(parsedJson.statusGroups) ? parsedJson.statusGroups : currentUi.statusGroups,
        statusConfigs: importedStatusConfigs.length > 0 ? importedStatusConfigs : currentUi.statusConfigs,
        taskStatuses: importedTaskStatuses.length > 0 ? importedTaskStatuses : currentUi.taskStatuses,
    });
}

export function setUiConfig(config: UiConfig) {
    const data = getAppData();
    data.companyData[getActiveCompanyId()].uiConfig = syncTaskStatuses(config);
    setAppData(data);
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('uiConfig', '', data.companyData[getActiveCompanyId()].uiConfig, 'set');
    }
}

export function addRepositoryConfig(repository: Omit<RepositoryConfig, 'id'>): RepositoryConfig {
    const trimmedName = repository.name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
        throw new Error('Repository name is required.');
    }

    const data = getAppData();
    const companyId = getActiveCompanyId();
    const currentUi = data.companyData[companyId].uiConfig;
    const existing = currentUi.repositoryConfigs.find(
        repo => repo.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
        return existing;
    }

    const newRepository: RepositoryConfig = {
        id: createId('repo-'),
        name: trimmedName,
        baseUrl: repository.baseUrl?.trim() || '',
    };

    const nextConfig = syncTaskStatuses({
        ...currentUi,
        repositoryConfigs: [...currentUi.repositoryConfigs, newRepository],
        fields: currentUi.fields.map(field => {
            if (field.key !== 'repositories') return field;

            const nextOptions = [...(field.options || [])];
            if (!nextOptions.some(option => option.value.trim().toLowerCase() === trimmedName.toLowerCase())) {
                nextOptions.push({
                    id: createId('field-option-'),
                    value: trimmedName,
                    label: trimmedName,
                });
            }

            return {
                ...field,
                options: nextOptions,
            };
        }),
    });

    data.companyData[companyId].uiConfig = nextConfig;
    setAppData(data);
    addLog({ message: `Added new repository: **${trimmedName}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('uiConfig', '', nextConfig, 'set');
    }

    return newRepository;
}

// Environment Management
export function addEnvironment(env: Omit<Environment, 'id'>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = createId('env-');
    const newEnv = { ...env, id };
    data.companyData[companyId].uiConfig.environments.push(newEnv);
    setAppData(data);
    addLog({ message: `Added new environment: **${env.name}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('uiConfig', '', data.companyData[companyId].uiConfig, 'set');
    }
}

export function updateEnvironment(id: string, updates: Partial<Environment>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const envs = data.companyData[companyId].uiConfig.environments;
    const index = envs.findIndex(e => e.id === id);
    if (index !== -1) {
        const oldName = envs[index].name;
        const newName = updates.name || oldName;
        
        if (newName !== oldName) {
            const tasks = data.companyData[companyId].tasks;
            const trash = data.companyData[companyId].trash;
            
            const updateTaskEnv = (t: Task) => {
                if (t.deploymentStatus && t.deploymentStatus[oldName] !== undefined) {
                    t.deploymentStatus[newName] = t.deploymentStatus[oldName];
                    delete t.deploymentStatus[oldName];
                }
                if (t.deploymentDates && t.deploymentDates[oldName] !== undefined) {
                    t.deploymentDates[newName] = t.deploymentDates[oldName];
                    delete t.deploymentDates[oldName];
                }
                if (t.prLinks && t.prLinks[oldName]) {
                    t.prLinks[newName] = t.prLinks[oldName];
                    delete t.prLinks[oldName];
                }
                if (t.relevantEnvironments) {
                    t.relevantEnvironments = t.relevantEnvironments.map(e => e === oldName ? newName : e);
                }
            };
            
            tasks.forEach(updateTaskEnv);
            trash.forEach(updateTaskEnv);
        }

        envs[index] = { ...envs[index], ...updates };
        setAppData(data);
        addLog({ message: `Updated properties for environment: **${oldName}**` });
        
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('uiConfig', '', data.companyData[companyId].uiConfig, 'set');
        }
    }
}

export function deleteEnvironment(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const envs = data.companyData[companyId].uiConfig.environments;
    const env = envs.find(e => e.id === id);
    
    if (!env) return false;
    if (env.isMandatory || ['dev', 'production'].includes(env.name?.toLowerCase() || '')) return false;

    data.companyData[companyId].uiConfig.environments = envs.filter(e => e.id !== id);
    
    const tasks = data.companyData[companyId].tasks;
    const trash = data.companyData[companyId].trash;
    const cleanup = (t: Task) => {
        if (t.deploymentStatus) delete t.deploymentStatus[env.name];
        if (t.deploymentDates) delete t.deploymentDates[env.name];
        if (t.prLinks) delete t.prLinks[env.name];
        if (t.relevantEnvironments) t.relevantEnvironments = t.relevantEnvironments.filter(e => e !== env.name);
    };
    tasks.forEach(cleanup);
    trash.forEach(cleanup);

    setAppData(data);
    addLog({ message: `Deleted environment: **${env.name}**` });
    
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('uiConfig', '', data.companyData[companyId].uiConfig, 'set');
    }
    return true;
}

function sanitizeTaskTemplateData(taskData: Partial<Task>): Partial<Task> {
    const {
        id,
        createdAt,
        updatedAt,
        deletedAt,
        comments,
        ...rest
    } = taskData;

    return cloneDeep({
        ...rest,
        priority: rest.priority || 'medium',
        dueAt: rest.dueAt || null,
        dueCompletedAt: rest.dueCompletedAt || null,
        dueReminderAt: rest.dueReminderAt || null,
        dueReminderPreset: rest.dueReminderPreset || null,
        dueReminderBackupAt: rest.dueReminderBackupAt || null,
        dueReminderBackupPreset: rest.dueReminderBackupPreset || null,
        reminder: rest.reminder || null,
        reminderExpiresAt: rest.reminderExpiresAt || null,
        customFields: rest.customFields || {},
        attachments: rest.attachments || [],
        repositories: rest.repositories || [],
        developers: rest.developers || [],
        testers: rest.testers || [],
        tags: rest.tags || [],
        prLinks: rest.prLinks || {},
        deploymentStatus: rest.deploymentStatus || {},
        deploymentDates: rest.deploymentDates || {},
        relevantEnvironments: rest.relevantEnvironments || ['dev', 'stage', 'production'],
        summary: rest.summary ?? null,
        azureWorkItemId: rest.azureWorkItemId || '',
    });
}

function normalizeTaskTemplateName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isValidDateString(value: unknown): value is string {
    return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function extractTemplatesFromJsonPayload(payload: unknown): Array<Partial<TaskTemplate>> {
    if (Array.isArray(payload)) {
        return payload.filter((item): item is Partial<TaskTemplate> => !!item && typeof item === 'object');
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.templates)) {
        return record.templates.filter((item): item is Partial<TaskTemplate> => !!item && typeof item === 'object');
    }

    if (Array.isArray(record.taskTemplates)) {
        return record.taskTemplates.filter((item): item is Partial<TaskTemplate> => !!item && typeof item === 'object');
    }

    if (typeof record.name === 'string' && record.taskData && typeof record.taskData === 'object') {
        return [record as Partial<TaskTemplate>];
    }

    return [];
}

export function getTaskTemplates(): TaskTemplate[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return (appData.companyData[companyId].taskTemplates || []).filter(template => !template.deletedAt);
}

export function getDeletedTaskTemplates(): TaskTemplate[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    const softDeleted = (appData.companyData[companyId].taskTemplates || []).filter(template => !!template.deletedAt);
    const legacyBin = appData.companyData[companyId].taskTemplateBin || [];
    return [...softDeleted, ...legacyBin].sort((a, b) => {
        const aDate = a.deletedAt || a.updatedAt || a.createdAt;
        const bDate = b.deletedAt || b.updatedAt || b.createdAt;
        return bDate.localeCompare(aDate);
    });
}

export function getTaskTemplateById(id: string, includeDeleted = false): TaskTemplate | null {
    const templates = includeDeleted ? [...getTaskTemplates(), ...getDeletedTaskTemplates()] : getTaskTemplates();
    return templates.find(template => template.id === id) || null;
}

export function addTaskTemplate(template: { name: string; description?: string; taskData: Partial<Task> }): TaskTemplate {
    const trimmedName = template.name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
        throw new Error('Template name is required.');
    }

    const data = getAppData();
    const companyId = getActiveCompanyId();
    const existingTemplates = data.companyData[companyId].taskTemplates || [];
    const normalizedName = normalizeTaskTemplateName(trimmedName);

    if (existingTemplates.some(item => !item.deletedAt && normalizeTaskTemplateName(item.name) === normalizedName)) {
        throw new Error('A template with this name already exists.');
    }

    const now = new Date().toISOString();
    const newTemplate: TaskTemplate = {
        id: createId('template-'),
        name: trimmedName,
        description: template.description?.trim() || '',
        taskData: sanitizeTaskTemplateData(template.taskData),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
    };

    data.companyData[companyId].taskTemplates = [newTemplate, ...existingTemplates];
    setAppData(data);
    addLog({ message: `Saved task template: **${newTemplate.name}**` });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('taskTemplates', '', data.companyData[companyId].taskTemplates, 'set');
    }

    return newTemplate;
}

export function buildTaskTemplatesExportPayload(templates: TaskTemplate[] = getTaskTemplates()) {
    const currentUiConfig = getUiConfig();

    return {
        format: 'taskflow-task-templates',
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: currentUiConfig.appName || 'My Task Manager',
        templateCount: templates.length,
        templates: templates.map(template => ({
            name: template.name,
            description: template.description || '',
            taskData: sanitizeTaskTemplateData(template.taskData || {}),
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
        })),
    };
}

export async function importTaskTemplatesFromJson(payload: unknown): Promise<{
    importedCount: number;
    skippedDuplicates: string[];
    importedTemplates: TaskTemplate[];
}> {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !data.companyData[companyId]) {
        throw new Error('No active workspace is available for template import.');
    }

    const incomingTemplates = extractTemplatesFromJsonPayload(payload);
    if (incomingTemplates.length === 0) {
        throw new Error('No task templates were found in this JSON file.');
    }

    const existingTemplates = data.companyData[companyId].taskTemplates || [];
    const activeNameSet = new Set(
        existingTemplates
            .filter(item => !item.deletedAt)
            .map(item => normalizeTaskTemplateName(item.name))
    );

    const now = new Date().toISOString();
    const importedTemplates: TaskTemplate[] = [];
    const skippedDuplicates: string[] = [];

    for (const candidate of incomingTemplates) {
        const trimmedName = typeof candidate.name === 'string' ? candidate.name.trim().replace(/\s+/g, ' ') : '';
        if (!trimmedName) {
            continue;
        }

        const normalizedName = normalizeTaskTemplateName(trimmedName);
        if (activeNameSet.has(normalizedName)) {
            skippedDuplicates.push(trimmedName);
            continue;
        }

        const taskData =
            candidate.taskData && typeof candidate.taskData === 'object'
                ? sanitizeTaskTemplateData(candidate.taskData as Partial<Task>)
                : sanitizeTaskTemplateData({});

        const importedTemplate: TaskTemplate = {
            id: createId('template-'),
            name: trimmedName,
            description: typeof candidate.description === 'string' ? candidate.description.trim() : '',
            taskData,
            createdAt: isValidDateString(candidate.createdAt) ? candidate.createdAt : now,
            updatedAt: isValidDateString(candidate.updatedAt) ? candidate.updatedAt : now,
            deletedAt: null,
        };

        importedTemplates.push(importedTemplate);
        activeNameSet.add(normalizedName);
    }

    if (importedTemplates.length === 0 && skippedDuplicates.length > 0) {
        return { importedCount: 0, skippedDuplicates, importedTemplates: [] };
    }

    if (importedTemplates.length === 0) {
        throw new Error('No valid task templates were available to import.');
    }

    data.companyData[companyId].taskTemplates = [...importedTemplates, ...existingTemplates];
    await assertLocalImportCapacity(data);
    setAppData(data);
    addLog({ message: `Imported ${importedTemplates.length} task template${importedTemplates.length === 1 ? '' : 's'} from JSON.` });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('taskTemplates', '', data.companyData[companyId].taskTemplates, 'set');
    }

    return {
        importedCount: importedTemplates.length,
        skippedDuplicates,
        importedTemplates,
    };
}

export function updateTaskTemplate(
    id: string,
    updates: { name: string; description?: string; taskData: Partial<Task> }
): TaskTemplate | null {
    const trimmedName = updates.name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
        throw new Error('Template name is required.');
    }

    const data = getAppData();
    const companyId = getActiveCompanyId();
    const templates = data.companyData[companyId].taskTemplates || [];
    const index = templates.findIndex(item => item.id === id);
    if (index === -1) return null;

    const normalizedName = normalizeTaskTemplateName(trimmedName);
    if (templates.some(item => item.id !== id && !item.deletedAt && normalizeTaskTemplateName(item.name) === normalizedName)) {
        throw new Error('A template with this name already exists.');
    }

    const updatedTemplate: TaskTemplate = {
        ...templates[index],
        name: trimmedName,
        description: updates.description?.trim() || '',
        taskData: sanitizeTaskTemplateData(updates.taskData),
        updatedAt: new Date().toISOString(),
    };

    data.companyData[companyId].taskTemplates[index] = updatedTemplate;
    setAppData(data);
    addLog({ message: `Updated task template: **${updatedTemplate.name}**` });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('taskTemplates', '', data.companyData[companyId].taskTemplates, 'set');
    }

    return updatedTemplate;
}

export function deleteTaskTemplate(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const templates = data.companyData[companyId].taskTemplates || [];
    const template = templates.find(item => item.id === id);
    if (!template) return false;

    data.companyData[companyId].taskTemplates = templates.map(item =>
        item.id === id ? { ...item, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item
    );
    setAppData(data);
    addLog({ message: `Moved task template to bin: **${template.name}**` });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('taskTemplates', '', data.companyData[companyId].taskTemplates, 'set');
    }

    return true;
}

export function restoreTaskTemplate(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const templates = data.companyData[companyId].taskTemplates || [];
    const template = templates.find(item => item.id === id && item.deletedAt);
    if (!template) return false;

    const normalizedName = normalizeTaskTemplateName(template.name);
    const hasActiveDuplicate = templates.some(
        item => item.id !== id && !item.deletedAt && normalizeTaskTemplateName(item.name) === normalizedName
    );
    if (hasActiveDuplicate) {
        throw new Error('An active template with this name already exists.');
    }

    data.companyData[companyId].taskTemplates = templates.map(item =>
        item.id === id ? { ...item, deletedAt: null, updatedAt: new Date().toISOString() } : item
    );
    setAppData(data);
    addLog({ message: `Restored task template from bin: **${template.name}**` });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('taskTemplates', '', data.companyData[companyId].taskTemplates, 'set');
    }

    return true;
}

export function permanentlyDeleteTaskTemplate(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const templates = data.companyData[companyId].taskTemplates || [];
    const legacyBin = data.companyData[companyId].taskTemplateBin || [];
    const template =
        templates.find(item => item.id === id && item.deletedAt) ||
        legacyBin.find(item => item.id === id);

    if (!template) return false;

    data.companyData[companyId].taskTemplates = templates.filter(item => item.id !== id);
    data.companyData[companyId].taskTemplateBin = legacyBin.filter(item => item.id !== id);
    setAppData(data);
    addLog({ message: `Permanently deleted task template: **${template.name}**` });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('taskTemplates', '', data.companyData[companyId].taskTemplates, 'set');
    }

    return true;
}

// People management
export function getDevelopers(): Person[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].developers || [];
}

export function addDeveloper(person: Omit<Person, 'id'>): Person {
    const data = getAppData();
    const id = createId('dev-');
    const newPerson = { ...person, id };
    const companyId = getActiveCompanyId();
    data.companyData[companyId].developers.push(newPerson);
    setAppData(data);
    addLog({ message: `Added new developer: **${person.name}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('developers', '', data.companyData[companyId].developers, 'set');
    }
    return newPerson;
}

export function updateDeveloper(id: string, updates: Partial<Person>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const index = data.companyData[companyId].developers.findIndex(p => p.id === id);
    if (index !== -1) {
        const oldName = data.companyData[companyId].developers[index].name;
        data.companyData[companyId].developers[index] = { ...data.companyData[companyId].developers[index], ...updates };
        setAppData(data);
        addLog({ message: `Updated developer details for **${oldName}**` });
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('developers', '', data.companyData[companyId].developers, 'set');
        }
    }
}

export function deleteDeveloper(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const person = data.companyData[companyId].developers.find(p => p.id === id);
    data.companyData[companyId].developers = data.companyData[companyId].developers.filter(p => p.id !== id);
    setAppData(data);
    addLog({ message: `Removed developer: **${person?.name || id}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('developers', '', data.companyData[companyId].developers, 'set');
    }
    return true;
}

export function getTesters(): Person[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].testers || [];
}

export function addTester(person: Omit<Person, 'id'>): Person {
    const data = getAppData();
    const id = createId('tester-');
    const newPerson = { ...person, id };
    const companyId = getActiveCompanyId();
    data.companyData[companyId].testers.push(newPerson);
    setAppData(data);
    addLog({ message: `Added new tester: **${person.name}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('testers', '', data.companyData[companyId].testers, 'set');
    }
    return newPerson;
}

export function updateTester(id: string, updates: Partial<Person>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const index = data.companyData[companyId].testers.findIndex(p => p.id === id);
    if (index !== -1) {
        const oldName = data.companyData[companyId].testers[index].name;
        data.companyData[companyId].testers[index] = { ...data.companyData[companyId].testers[index], ...updates };
        setAppData(data);
        addLog({ message: `Updated tester details for **${oldName}**` });
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('testers', '', data.companyData[companyId].testers, 'set');
        }
    }
}

export function deleteTester(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const person = data.companyData[companyId].testers.find(p => p.id === id);
    data.companyData[companyId].testers = data.companyData[companyId].testers.filter(p => p.id !== id);
    setAppData(data);
    addLog({ message: `Removed tester: **${person?.name || id}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('testers', '', data.companyData[companyId].testers, 'set');
    }
    return true;
}

// Logs
export function getAggregatedLogs(): Log[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].logs || [];
}

export function getLogs(): Log[] {
    return getAggregatedLogs();
}

export function getLogsForTask(taskId: string): Log[] {
    return getAggregatedLogs().filter(l => l.taskId === taskId);
}

function _addLog(companyData: CompanyData, logData: Omit<Log, 'id' | 'timestamp'>) {
    const newLog: Log = {
        id: createId('log-'),
        timestamp: new Date().toISOString(),
        ...logData,
    };
    companyData.logs = [newLog, ...(companyData.logs || []).slice(0, 1999)];
    dispatchMutation('logs', newLog.id, newLog, 'set');
}

export function addLog(log: Omit<Log, 'id' | 'timestamp'>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    if (!data.companyData[companyId]) return;
    
    let userId: string | undefined;
    let userName: string | undefined;
    
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            userId = user.uid;
            userName = user.displayName || user.email || 'Cloud User';
        } else {
            const local = getLocalProfile();
            userName = local.username || 'Local User';
        }
    } catch (e) {
        userName = 'System';
    }

    const logWithUser = {
        ...log,
        userId,
        userName
    };

    _addLog(data.companyData[companyId]!, logWithUser);
    setAppData(data);
}

// Tasks
export function getTasks(): Task[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].tasks || [];
}

export function getTaskById(id: string): Task | undefined {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return undefined;
    return appData.companyData[companyId].tasks.find(t => t.id === id) || 
           appData.companyData[companyId].trash.find(t => t.id === id);
}

export function getRecentTasks(limitCount = 5): Task[] {
    const tasks = getTasks();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return tasks
        .filter(t => new Date(t.createdAt) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limitCount);
}

function resolveImportSourceFromLogMessage(message: string): 'json' | 'excel' | null {
    if (message.includes('via Excel import')) return 'excel';
    if (message.includes('via JSON import') || message.includes('from external source')) return 'json';
    return null;
}

export function getRecentImportedTasks(limitCount = 5): Task[] {
    const jsonTasks = getRecentImportedTasksBySource('json', limitCount);
    const excelTasks = getRecentImportedTasksBySource('excel', limitCount);

    return [...jsonTasks, ...excelTasks]
        .filter((task, index, list) => list.findIndex(candidate => candidate.id === task.id) === index)
        .slice(0, limitCount);
}

export function getRecentImportedTasksBySource(source: 'json' | 'excel', limitCount = 5): Task[] {
    const logs = getLogs();
    const tasks = getTasks();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const importedTaskTimestamps = new Map<string, number>();
    logs
        .filter(l => l.taskId && l.message.includes('Imported task') && new Date(l.timestamp) >= sevenDaysAgo)
        .filter(l => resolveImportSourceFromLogMessage(l.message) === source)
        .forEach(log => {
            const currentTimestamp = importedTaskTimestamps.get(log.taskId!);
            const nextTimestamp = new Date(log.timestamp).getTime();
            if (!currentTimestamp || nextTimestamp > currentTimestamp) {
                importedTaskTimestamps.set(log.taskId!, nextTimestamp);
            }
        });

    return tasks
        .filter(t => importedTaskTimestamps.has(t.id))
        .sort((a, b) => (importedTaskTimestamps.get(b.id) || 0) - (importedTaskTimestamps.get(a.id) || 0))
        .slice(0, limitCount);
}

export function checkUniqueness(
    taskData: Partial<Task>, 
    excludeTaskId?: string
): { isUnique: boolean; fieldLabel?: string; value?: string } {
    const activeTasks = getTasks();
    const config = getUiConfig();
    const uniqueFields = config.fields.filter(f => f.isActive && f.isUnique);

    for (const field of uniqueFields) {
        let valToCheck = field.isCustom 
            ? taskData.customFields?.[field.key] 
            : (taskData as any)[field.key];

        if (valToCheck && typeof valToCheck === 'string' && valToCheck.trim() !== '') {
            const normalized = valToCheck.trim().toLowerCase();
            const conflict = activeTasks.find(t => {
                if (excludeTaskId && t.id === excludeTaskId) return false;
                const otherVal = field.isCustom ? t.customFields?.[field.key] : (t as any)[field.key];
                return otherVal && typeof otherVal === 'string' && otherVal.trim().toLowerCase() === normalized;
            });

            if (conflict) {
                return { isUnique: false, fieldLabel: field.label, value: valToCheck };
            }
        }
    }

    return { isUnique: true };
}

export function findExistingDuplicates(): { fieldLabel: string; value: string; tasks: Task[] }[] {
    const tasks = getTasks();
    const config = getUiConfig();
    const uniqueFields = config.fields.filter(f => f.isActive && f.isUnique);
    const results: { fieldLabel: string; value: string; tasks: Task[] }[] = [];

    uniqueFields.forEach(field => {
        const valueMap = new Map<string, Task[]>();
        tasks.forEach(task => {
            const val = field.isCustom ? task.customFields?.[field.key] : (task as any)[field.key];
            if (val && typeof val === 'string' && val.trim() !== '') {
                const norm = val.trim().toLowerCase();
                if (!valueMap.has(norm)) valueMap.set(norm, []);
                valueMap.get(norm)!.push(task);
            }
        });

        valueMap.forEach((matchedTasks, value) => {
            if (matchedTasks.length > 1) {
                results.push({ fieldLabel: field.label, value, tasks: matchedTasks });
            }
        });
    });

    return results;
}

export function addTask(task: Partial<Task>): Task {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = createId('task-');
    const now = new Date().toISOString();
    const defaultStatus = getUiConfig().taskStatuses[0] || 'To Do';
    const newTask: Task = {
        title: '', description: '', status: defaultStatus,
        priority: 'medium',
        ...task,
        id, createdAt: now, updatedAt: now
    } as Task;
    data.companyData[companyId].tasks.unshift(newTask);
    setAppData(data);
    invalidateCurrentTaskReadCache(newTask.id);
    
    let logMsg = `Created task "**${newTask.title}**"`;
    if (newTask.attachments && newTask.attachments.length > 0) {
        logMsg += ` with **${newTask.attachments.length}** attachment(s)`;
    }
    addLog({ message: logMsg, taskId: id });

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('tasks', id, newTask, 'create');
    }
    return newTask;
}

function formatPlanningTimestamp(value: unknown): string {
    if (!value || typeof value !== 'string') return 'None';
    return formatTimestamp(value, getUiConfig().timeFormat);
}

const formatLogVal = (val: any, key: string, uiConfig: UiConfig, peopleMap: Map<string, string>): string => {
    if (val === null || val === undefined || val === '') return '*None*';
    if (key === 'developers' || key === 'testers') {
        const ids = Array.isArray(val) ? val : [val];
        const names = ids.map(id => peopleMap.get(id) || id).filter(Boolean);
        return names.length > 0 ? `*[${names.join(', ')}]*` : '*None*';
    }
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        try { return `*${new Date(val).toLocaleDateString()}*`; } catch { return `*${val}*`; }
    }
    if (typeof val === 'boolean') return val ? '*Yes*' : '*No*';
    if (Array.isArray(val)) return val.length > 0 ? `*[${val.join(', ')}]*` : '*Empty*';
    return `*${val}*`;
};

export function updateTask(id: string, updates: Partial<Task>, silent = false): Task | null {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const taskIndex = data.companyData[companyId].tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return null;

    const oldTask = data.companyData[companyId].tasks[taskIndex];
    const newTask = { ...oldTask, ...updates, updatedAt: new Date().toISOString() };
    data.companyData[companyId].tasks[taskIndex] = newTask;
    setAppData(data);
    invalidateCurrentTaskReadCache(id);

    if (!silent) {
        const config = getUiConfig();
        const fieldLabels = new Map(config.fields.map(f => [f.key, f.label]));
        const allPeople = [...data.companyData[companyId].developers, ...data.companyData[companyId].testers];
        const peopleMap = new Map(allPeople.map(p => [p.id, p.name]));
        
        const changes: string[] = [];
        for (const key in updates) {
            if (['updatedAt', 'createdAt', 'id', 'deletedAt', 'comments', 'summary'].includes(key)) continue;
            
            const newVal = (updates as any)[key];
            const oldVal = (oldTask as any)[key];
            if (JSON.stringify(newVal) === JSON.stringify(oldVal)) continue;

            const label = fieldLabels.get(key) || key;

            if (key === 'description') {
                changes.push(`updated the **Description**`);
            } else if (key === 'priority') {
                changes.push(`set **Priority** to *${getTaskPriorityLabel(typeof newVal === 'string' ? newVal : null)}*`);
            } else if (key === 'dueAt') {
                changes.push(
                    newVal
                        ? `set **Due Date** to *${formatPlanningTimestamp(newVal)}*`
                        : 'cleared **Due Date**'
                );
            } else if (key === 'dueCompletedAt') {
                changes.push(
                    newVal
                        ? `marked **Due Completion** at *${formatPlanningTimestamp(newVal)}*`
                        : 'reset **Due Completion**'
                );
            } else if (key === 'dueReminderAt') {
                const nextPresetLabel = updates.dueReminderPreset
                    ? getDueReminderPresetLabel(String(updates.dueReminderPreset))
                    : oldTask.dueReminderPreset
                        ? getDueReminderPresetLabel(oldTask.dueReminderPreset)
                        : 'Custom time';
                changes.push(
                    newVal
                        ? `scheduled **Due Reminder** for *${formatPlanningTimestamp(newVal)}* (${nextPresetLabel})`
                        : oldVal
                            ? 'cleared **Due Reminder**'
                            : 'updated **Due Reminder**'
                );
            } else if (key === 'dueReminderPreset' || key === 'dueReminderBackupAt' || key === 'dueReminderBackupPreset') {
                continue;
            } else if (key === 'reminder') {
                changes.push(
                    newVal
                        ? oldVal
                            ? 'updated **Reminder Note**'
                            : 'added a **Reminder Note**'
                        : 'cleared **Reminder Note**'
                );
            } else if (key === 'reminderExpiresAt') {
                changes.push(
                    newVal
                        ? `set **Reminder Note Auto-Clear** to *${formatPlanningTimestamp(newVal)}*`
                        : oldVal
                            ? 'cleared **Reminder Note Auto-Clear**'
                            : 'updated **Reminder Note Auto-Clear**'
                );
            } else if (key === 'isFavorite') {
                changes.push(newVal ? `marked as **Favourite**` : `removed from **Favourites**`);
            } else if (key === 'deploymentStatus') {
                const statuses = newVal as Record<string, boolean>;
                const oldStatuses = oldVal as Record<string, boolean> || {};
                Object.keys(statuses).forEach(env => {
                    if (statuses[env] !== oldStatuses[env]) {
                        changes.push(`marked **${env}** as **${statuses[env] ? 'Deployed' : 'Pending'}**`);
                    }
                });
            } else if (key === 'deploymentDates') {
                changes.push(`updated **Deployment Dates**`);
            } else if (key === 'attachments') {
                const oldAtts = (oldVal || []) as Attachment[];
                const newAtts = (newVal || []) as Attachment[];
                
                const added = newAtts.filter(na => !oldAtts.some(oa => na.url === oa.url));
                const removed = oldAtts.filter(oa => !newAtts.some(na => na.url === oa.url));
                const renamed = newAtts.filter(na => {
                    const old = oldAtts.find(oa => oa.url === na.url);
                    return old && old.name !== na.name;
                });
                
                const attChanges = [];
                if (added.length > 0) attChanges.push(`added **${added.length}** attachment(s) (${added.map(a => `*${a.name}*`).join(', ')})`);
                if (removed.length > 0) attChanges.push(`removed **${removed.length}** attachment(s) (${removed.map(a => `*${a.name}*`).join(', ')})`);
                if (renamed.length > 0) {
                    const renameDetails = renamed.map(na => {
                        const old = oldAtts.find(oa => oa.url === na.url);
                        return `*${old?.name}* to *${na.name}*`;
                    }).join(', ');
                    attChanges.push(`renamed **${renamed.length}** attachment(s) (${renameDetails})`);
                }
                
                if (attChanges.length > 0) {
                    changes.push(attChanges.join(', '));
                } else {
                    changes.push(`updated attachment details`);
                }
            } else if (key === 'customFields') {
                const cfs = newVal as Record<string, any>;
                const oldCfs = oldVal as Record<string, any> || {};
                for (const cfKey in cfs) {
                    if (JSON.stringify(cfs[cfKey]) !== JSON.stringify(oldCfs[cfKey])) {
                        const cfConfig = config.fields.find(f => f.key === cfKey);
                        const cfLabel = cfConfig?.label || cfKey;
                        changes.push(`changed **${cfLabel}** from ${formatLogVal(oldCfs[cfKey], cfKey, config, peopleMap)} to ${formatLogVal(cfs[cfKey], cfKey, config, peopleMap)}`);
                    }
                }
            } else if (key === 'prLinks') {
                changes.push(`updated **${label}**`);
            } else {
                changes.push(`changed **${label}** from ${formatLogVal(oldVal, key, config, peopleMap)} to ${formatLogVal(newVal, key, config, peopleMap)}`);
            }
        }

        if (changes.length > 0) {
            addLog({ message: `Task "**${newTask.title}**": ${changes.join(', ')}`, taskId: id });
        }
    }

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('tasks', id, newTask, 'update');
    }
    return newTask;
}

export function moveTaskToBin(id: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const taskIndex = data.companyData[companyId].tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const task = data.companyData[companyId].tasks.splice(taskIndex, 1)[0];
    task.deletedAt = new Date().toISOString();
    data.companyData[companyId].trash.unshift(task);
    setAppData(data);
    invalidateCurrentTaskReadCache(id);
    addLog({ message: `Moved task "**${task.title}**" to the bin`, taskId: id });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('tasks', id, task, 'update');
    }
}

export function restoreTask(id: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const taskIndex = data.companyData[companyId].trash.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const task = data.companyData[companyId].trash[taskIndex];
    
    const uniqueness = checkUniqueness(task);
    if (!uniqueness.isUnique) {
        throw new Error(`Cannot restore — duplicate exists in active tasks for unique field "${uniqueness.fieldLabel}"`);
    }

    data.companyData[companyId].trash.splice(taskIndex, 1);
    task.deletedAt = null;
    task.updatedAt = new Date().toISOString();
    data.companyData[companyId].tasks.unshift(task);
    setAppData(data);
    invalidateCurrentTaskReadCache(id);
    addLog({ message: `Restored task "**${task.title}**" from the bin`, taskId: id });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('tasks', id, task, 'update');
    }
}

export function moveMultipleTasksToBin(ids: string[]) {
    ids.forEach(id => moveTaskToBin(id));
}

export function restoreMultipleTasks(ids: string[]) {
    ids.forEach(id => {
        try {
            restoreTask(id);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Restore Blocked', description: e.message });
        }
    });
}

export function permanentlyDeleteMultipleTasks(ids: string[]) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const deletedCount = ids.length;
    data.companyData[companyId].trash = data.companyData[companyId].trash.filter(t => !ids.includes(t.id));
    setAppData(data);
    ids.forEach(id => invalidateCurrentTaskReadCache(id));
    addLog({ message: `Permanently deleted **${deletedCount}** task(s) from the bin.` });
    if (getAuthMode() === 'authenticate') {
        ids.forEach(id => dispatchMutation('tasks', id, null, 'delete'));
    }
}

export function emptyBin() {
    const binned = getBinnedTasks();
    permanentlyDeleteMultipleTasks(binned.map(t => t.id));
}

export function addTagsToMultipleTasks(taskIds: string[], tagsToAdd: string[]) {
    taskIds.forEach(id => {
        const task = getTaskById(id);
        if (task) {
            const currentTags = task.tags || [];
            const newTags = [...new Set([...currentTags, ...tagsToAdd])];
            updateTask(id, { tags: newTags }, true);
        }
    });
    addLog({ message: `Applied tags [${tagsToAdd.join(', ')}] to **${taskIds.length}** task(s).` });
}

// Binned Tasks
export function getBinnedTasks(): Task[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].trash || [];
}

// Notes
export function getNotes(): Note[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].notes || [];
}

export function addNote(note: Partial<Note>): Note {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = createId('note-');
    const now = new Date().toISOString();
    const newNote: Note = {
        title: '', content: '',
        ...note,
        id, createdAt: now, updatedAt: now,
        layout: { i: id, x: 0, y: 0, w: 4, h: 4 }
    } as Note;
    data.companyData[companyId].notes.unshift(newNote);
    setAppData(data);
    invalidateCurrentNoteReadCache(newNote.id);
    addLog({ message: `Created new note: "**${newNote.title || 'Untitled'}**"` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('notes', id, newNote, 'create');
    }
    return newNote;
}

export function updateNote(id: string, updates: Partial<Note>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const index = data.companyData[companyId].notes.findIndex(n => n.id === id);
    if (index !== -1) {
        const oldTitle = data.companyData[companyId].notes[index].title;
        data.companyData[companyId].notes[index] = { ...data.companyData[companyId].notes[index], ...updates, updatedAt: new Date().toISOString() };
        setAppData(data);
        invalidateCurrentNoteReadCache(id);
        if (updates.title && updates.title !== oldTitle) {
            addLog({ message: `Renamed note from "**${oldTitle}**" to "**${updates.title}**"` });
        }
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('notes', id, data.companyData[companyId].notes[index], 'update');
        }
    }
}

export function deleteNote(id: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const note = data.companyData[companyId].notes.find(n => n.id === id);
    data.companyData[companyId].notes = data.companyData[companyId].notes.filter(n => n.id !== id);
    setAppData(data);
    invalidateCurrentNoteReadCache(id);
    addLog({ message: `Deleted note: "**${note?.title || 'Untitled'}**"` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('notes', id, null, 'delete');
    }
}

export function deleteMultipleNotes(ids: string[]) {
    ids.forEach(id => deleteNote(id));
}

export function importNotes(notes: Partial<Note>[]) {
    notes.forEach(n => addNote(n));
}

export function updateNoteLayouts(layouts: NoteLayout[]) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    layouts.forEach(l => {
        const note = data.companyData[companyId].notes.find(n => n.id === l.i);
        if (note) {
            note.layout = { ...l };
            if (getAuthMode() === 'authenticate') {
                dispatchMutation('notes', note.id, note, 'update');
            }
        }
    });
    setAppData(data);
    invalidateCurrentNoteReadCache();
}

export function resetNotesLayout(): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const notes = data.companyData[companyId].notes;
    if (notes.length === 0) return false;
    notes.forEach((note, idx) => {
        note.layout = { i: note.id, x: (idx * 4) % 12, y: Math.floor(idx / 3) * 4, w: 4, h: 4 };
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('notes', note.id, note, 'update');
        }
    });
    setAppData(data);
    invalidateCurrentNoteReadCache();
    return true;
}

// General Reminders
export function getGeneralReminders(): GeneralReminder[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    return appData.companyData[companyId].generalReminders || [];
}

export function addGeneralReminder(text: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = createId('rem-');
    const now = new Date().toISOString();
    const newRem = { id, text, createdAt: now };
    data.companyData[companyId].generalReminders.unshift(newRem);
    setAppData(data);
    addLog({ message: `Added new general reminder.` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('generalReminders', '', data.companyData[companyId].generalReminders, 'set');
    }
}

export function updateGeneralReminder(id: string, text: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const index = data.companyData[companyId].generalReminders.findIndex(r => r.id === id);
    if (index !== -1) {
        data.companyData[companyId].generalReminders[index].text = text;
        setAppData(data);
        addLog({ message: `Updated a general reminder.` });
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('generalReminders', '', data.companyData[companyId].generalReminders, 'set');
        }
    }
}

export function deleteGeneralReminder(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    data.companyData[companyId].generalReminders = data.companyData[companyId].generalReminders.filter(r => r.id !== id);
    setAppData(data);
    addLog({ message: `Dismissed a general reminder.` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('generalReminders', '', data.companyData[companyId].generalReminders, 'set');
    }
    return true;
}

export function clearExpiredReminders(): { updatedTaskIds: string[], unpinnedTaskIds: string[] } {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !data.companyData?.[companyId]) {
        return { updatedTaskIds: [], unpinnedTaskIds: [] };
    }
    const tasks = data.companyData[companyId].tasks;
    const now = new Date();
    const updatedTaskIds: string[] = [];
    const unpinnedTaskIds: string[] = [];
    tasks.forEach(t => {
        if (t.reminder && t.reminderExpiresAt && new Date(t.reminderExpiresAt) <= now) {
            t.reminder = null;
            t.reminderExpiresAt = null;
            updatedTaskIds.push(t.id);
            unpinnedTaskIds.push(t.id);
            addLog({ message: `Reminder for task "**${t.title}**" expired and was automatically cleared.`, taskId: t.id });
            if (getAuthMode() === 'authenticate') {
                dispatchMutation('tasks', t.id, t, 'update');
            }
        }
    });
    if (updatedTaskIds.length > 0) {
        setAppData(data);
        if (typeof window !== 'undefined' && unpinnedTaskIds.length > 0) {
            try {
                const storedPinnedIds = JSON.parse(window.localStorage.getItem(PINNED_TASKS_STORAGE_KEY) || '[]') as string[];
                const nextPinnedIds = storedPinnedIds.filter(id => !unpinnedTaskIds.includes(id));
                window.localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(nextPinnedIds));
            } catch {
                window.localStorage.removeItem(PINNED_TASKS_STORAGE_KEY);
            }
        }
        window.dispatchEvent(new Event('reminders-expired'));
    }
    return { updatedTaskIds, unpinnedTaskIds };
}

// Release Updates
export function getReleaseUpdates(publishedOnly = true): ReleaseUpdate[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    const all = appData.companyData[companyId].releaseUpdates || [];
    const sortByNewest = (left: ReleaseUpdate, right: ReleaseUpdate) =>
        new Date(right.publishedAt || right.date).getTime() - new Date(left.publishedAt || left.date).getTime();
    if (publishedOnly) return all.filter(r => r.isPublished).sort(sortByNewest);
    return [...all].sort(sortByNewest);
}

export function addReleaseUpdate(release: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = createId('rel-');
    const now = new Date().toISOString();
    const newRel = {
        id,
        version: '',
        title: '',
        items: [],
        date: now,
        publishedAt: release.isPublished ? now : null,
        isPublished: false,
        ...release,
    } as ReleaseUpdate;
    data.companyData[companyId].releaseUpdates.unshift(newRel);
    setAppData(data);
    addLog({ message: `Created new release draft: **v${newRel.version}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('releaseUpdates', '', data.companyData[companyId].releaseUpdates, 'set');
    }
}

export function updateReleaseUpdate(id: string, updates: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const index = data.companyData[companyId].releaseUpdates.findIndex(r => r.id === id);
    if (index !== -1) {
        const oldRel = data.companyData[companyId].releaseUpdates[index];
        const nextRelease = { ...data.companyData[companyId].releaseUpdates[index], ...updates } as ReleaseUpdate;
        if (updates.isPublished && !oldRel.isPublished) {
            nextRelease.publishedAt = new Date().toISOString();
        }
        data.companyData[companyId].releaseUpdates[index] = nextRelease;
        setAppData(data);
        if (updates.isPublished && !oldRel.isPublished) {
            addLog({ message: `Published new application release: **v${oldRel.version}**` });
        }
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('releaseUpdates', '', data.companyData[companyId].releaseUpdates, 'set');
        }
    }
}

export function deleteReleaseUpdate(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const rel = data.companyData[companyId].releaseUpdates.find(r => r.id === id);
    data.companyData[companyId].releaseUpdates = data.companyData[companyId].releaseUpdates.filter(r => r.id !== id);
    setAppData(data);
    addLog({ message: `Deleted release: **v${rel?.version || id}**` });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('releaseUpdates', '', data.companyData[companyId].releaseUpdates, 'set');
    }
    return true;
}

// Comment management
export function addComment(taskId: string, text: string): Task | null {
    const comment: Comment = { text, timestamp: new Date().toISOString() };
    const task = getTaskById(taskId);
    if (task) {
        const comments = [...(task.comments || []), comment];
        const updated = updateTask(taskId, { comments }, true);
        if (updated) {
            addLog({ message: `Added a comment to task "**${updated.title}**"`, taskId });
        }
        return updated;
    }
    return null;
}

export function updateComment(taskId: string, index: number, text: string): Task | null {
    const task = getTaskById(taskId);
    if (task && task.comments && task.comments[index]) {
        const comments = [...task.comments];
        comments[index] = { ...comments[index], text };
        const updated = updateTask(taskId, { comments }, true);
        if (updated) {
            addLog({ message: `Updated a comment on task "**${updated.title}**"`, taskId });
        }
        return updated;
    }
    return null;
}

export function deleteComment(taskId: string, index: number): Task | null {
    const task = getTaskById(taskId);
    if (task && task.comments && task.comments[index]) {
        const comments = task.comments.filter((_, i) => i !== index);
        const updated = updateTask(taskId, { comments }, true);
        if (updated) {
            addLog({ message: `Removed a comment from task "**${updated.title}**"`, taskId });
        }
        return updated;
    }
    return null;
}

export function getTasksUsingField(key: string): Task[] {
    const tasks = getTasks();
    const binned = getBinnedTasks();
    const all = [...tasks, ...binned];
    
    return all.filter(t => {
        const standardVal = (t as any)[key];
        if (standardVal !== undefined && standardVal !== null && standardVal !== '' && 
            (!Array.isArray(standardVal) || standardVal.length > 0)) {
            return true;
        }
        if (t.customFields && t.customFields[key] !== undefined && t.customFields[key] !== null && t.customFields[key] !== '' && 
            (!Array.isArray(t.customFields[key]) || t.customFields[key].length > 0)) {
            return true;
        }
        return false;
    });
}

// Support & Feedback
export async function submitFeedback(feedback: Omit<Feedback, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const id = createId('feedback-');
    const now = new Date().toISOString();
    
    const auth = getAuth();
    const user = auth.currentUser;
    const userName = user?.displayName || user?.email?.split('@')[0] || 'Guest User';

    const newFeedback: Feedback = {
        ...feedback,
        id,
        userName,
        status: 'Submitted',
        createdAt: now,
        updatedAt: now
    };

    const autoReply: FeedbackMessage = {
        id: createId('msg-auto-'),
        senderId: 'system-support',
        senderName: 'TaskFlow Support',
        senderRole: 'admin',
        message: "Thanks for reaching out! We’ve received your request and will get back to you soon.",
        timestamp: now
    };

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('feedback', id, newFeedback, 'set');
        dispatchMutation('feedbackMessages', autoReply.id, autoReply, 'set', id);
        
        // Instant Notification for Admins
        createNotification({
            recipientId: 'admin',
            type: 'user_request',
            title: 'New Support Request',
            message: `${userName} submitted: ${feedback.title}`,
            link: `/feedback/${id}`,
        });
    } else {
        const data = getAppData();
        if (!(data as any).localFeedback) (data as any).localFeedback = [];
        (data as any).localFeedback.push(newFeedback);
        
        if (!(data as any).localMessages) (data as any).localMessages = {};
        if (!(data as any).localMessages[id]) (data as any).localMessages[id] = [];
        (data as any).localMessages[id].push(autoReply);
        
        setAppData(data);
    }
    
    addLog({ message: `Submitted a **${feedback.type}**: "**${feedback.title}**"` });
    return newFeedback;
}

export async function getMyFeedback(): Promise<Feedback[]> {
    const mode = getAuthMode();
    if (mode === 'authenticate') {
        const auth = getAuth();
        const db = getFirestore();
        const userId = auth.currentUser?.uid;
        if (!userId) return [];

        const qFeedback = query(collection(db, 'feedback'), where('userId', '==', userId));
        try {
            const snap = await getDocs(qFeedback);
            const items = snap.docs.map(d => d.data() as Feedback);
            return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
            console.error("Failed to fetch my feedback:", e);
            return [];
        }
    } else {
        const data = getAppData();
        return ((data as any).localFeedback || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
    const mode = getAuthMode();
    if (mode === 'authenticate') {
        const db = getFirestore();
        const docRef = doc(db, 'feedback', id);
        try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as Feedback;
                const auth = getAuth();
                const userId = auth.currentUser?.uid;
                
                const userProfileSnap = await getDoc(doc(db, 'users', userId!));
                const userProfile = userProfileSnap.data() as UserProfile;
                if (userProfile?.role !== 'admin' && data.userId !== userId) return null;
                
                return data;
            }
            return null;
        } catch (e) {
            console.error("Failed to fetch feedback:", e);
            return null;
        }
    } else {
        const data = getAppData();
        const localFeedback = (data as any).localFeedback || [];
        return localFeedback.find((f: any) => f.id === id) || null;
    }
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
    if (getAuthMode() === 'authenticate') {
        const db = getFirestore();
        const docRef = doc(db, 'feedback', id);
        
        try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as Feedback;
                
                dispatchMutation('feedback', id, { status, updatedAt: new Date().toISOString() }, 'update');
                
                // Notify the User about status update
                createNotification({
                    recipientId: data.userId,
                    type: 'admin_reply',
                    title: 'Support Update',
                    message: `Status changed to "${status}" for: ${data.title}`,
                    link: `/feedback/${id}`,
                });
            }
        } catch (e) {
            console.error("Failed to fetch feedback for status update notification", e);
            dispatchMutation('feedback', id, { status, updatedAt: new Date().toISOString() }, 'update');
        }
    } else {
        const data = getAppData();
        const localFeedback = (data as any).localFeedback || [];
        const index = localFeedback.findIndex((f: any) => f.id === id);
        if (index !== -1) {
            localFeedback[index].status = status;
            localFeedback[index].updatedAt = new Date().toISOString();
            setAppData(data);
        }
    }
}

export async function sendFeedbackMessage(feedbackId: string, message: string, attachments?: Attachment[]) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const db = getFirestore();
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const userProfile = userSnap.data() as UserProfile;

    const id = createId('msg-');
    const now = new Date().toISOString();
    const newMessage: FeedbackMessage = {
        id,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User',
        senderRole: userProfile?.role === 'admin' ? 'admin' : 'user',
        message,
        timestamp: now,
        attachments
    };

    if (getAuthMode() === 'authenticate') {
        dispatchMutation('feedbackMessages', id, newMessage, 'set', feedbackId);
        dispatchMutation('feedback', feedbackId, { updatedAt: now }, 'update');
        
        // Notify the OTHER party
        if (userProfile?.role === 'admin') {
            getDoc(doc(db, 'feedback', feedbackId)).then(fbSnap => {
                if (fbSnap.exists()) {
                    const fbData = fbSnap.data() as Feedback;
                    createNotification({
                        recipientId: fbData.userId,
                        type: 'admin_reply',
                        title: 'New Support Message',
                        message: `Admin replied: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
                        link: `/feedback/${feedbackId}`,
                    });
                }
            });
        } else {
            createNotification({
                recipientId: 'admin',
                type: 'user_request',
                title: 'New Feedback Reply',
                message: `${user.displayName || user.email} replied: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
                link: `/feedback/${feedbackId}`,
            });
        }
    } else {
        const data = getAppData();
        if (!(data as any).localMessages) (data as any).localMessages = {};
        if (!(data as any).localMessages[feedbackId]) (data as any).localMessages[feedbackId] = [];
        (data as any).localMessages[feedbackId].push(newMessage);
        setAppData(data);
    }
}

export async function getFeedbackAdmin(): Promise<Feedback[]> {
    const auth = getAuth();
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const userSnap = await getDoc(doc(db, 'users', userId));
    const userProfile = userSnap.data() as UserProfile;
    if (userProfile?.role !== 'admin') return [];

    const qFeedback = query(collection(db, 'feedback'), orderBy('updatedAt', 'desc'));
    try {
        const snap = await getDocs(qFeedback);
        return snap.docs.map(d => d.data() as Feedback);
    } catch (e) {
        console.error("Admin fetch feedback error:", e);
        return [];
    }
}

// Data Utility Functions
export async function importWorkspaceData(parsedJson: any, onProgress?: (percent: number) => void) {
    const mode = getAuthMode();
    const companyId = getActiveCompanyId();
    const db = getFirestore();
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'Importer';
    
    if (mode === 'authenticate' && !userId) throw new Error("You must be signed in to import data to the cloud.");

    let rawTasks, jsonDevs, jsonTesters, jsonNotes, jsonLogs, repoConfigs, envs;
    try {
        rawTasks = Array.isArray(parsedJson.tasks)
            ? parsedJson.tasks
            : parsedJson.task
                ? [parsedJson.task]
                : [];
        jsonDevs = Array.isArray(parsedJson.developers) ? parsedJson.developers : [];
        jsonTesters = Array.isArray(parsedJson.testers) ? parsedJson.testers : [];
        jsonNotes = Array.isArray(parsedJson.notes) ? parsedJson.notes : [];
        jsonLogs = Array.isArray(parsedJson.logs) ? parsedJson.logs : [];
        repoConfigs = Array.isArray(parsedJson.repositoryConfigs) ? parsedJson.repositoryConfigs : [];
        envs = Array.isArray(parsedJson.environments) ? parsedJson.environments : [];
    } catch (e) {
        throw new Error("The imported file is invalid or corrupted. Please check the file format.");
    }

    const uiConfig = getUiConfig();
    const activeTasks = getTasks();
    const uniqueFields = uiConfig.fields.filter(f => f.isActive && f.isUnique);
    
    const skippedTasks: { taskTitle: string; field: string; value: string }[] = [];
    const usedValuesByField = new Map<string, Set<string>>();
    
    uniqueFields.forEach(f => {
        const set = new Set<string>();
        activeTasks.forEach(t => {
            const val = f.isCustom ? t.customFields?.[f.key] : (t as any)[f.key];
            if (val && typeof val === 'string' && val.trim() !== '') {
                set.add(val.trim().toLowerCase());
            }
        });
        usedValuesByField.set(f.key, set);
    });

    const tasksToImport: any[] = [];
    rawTasks.forEach((t: any) => {
        let isDuplicate = false;
        for (const f of uniqueFields) {
            const val = f.isCustom ? t.customFields?.[f.key] : (t as any)[f.key];
            if (val && typeof val === 'string' && val.trim() !== '') {
                const normalized = val.trim().toLowerCase();
                const set = usedValuesByField.get(f.key)!;
                if (set.has(normalized)) {
                    skippedTasks.push({ taskTitle: t.title || 'Untitled', field: f.label, value: val });
                    isDuplicate = true;
                    break;
                }
                set.add(normalized);
            }
        }
        if (!isDuplicate) {
            tasksToImport.push(t);
        }
    });

    let currentDevs = [...getDevelopers()];
    let currentTesters = [...getTesters()];

    const devMap = new Map<string, string>(currentDevs.map(d => [d.name.toLowerCase(), d.id]));
    const testerMap = new Map<string, string>(currentTesters.map(t => [t.name.toLowerCase(), t.id]));

    const ensureDev = (name: string, details?: any) => {
        if (!name || devMap.has(name.toLowerCase())) return devMap.get(name.toLowerCase())!;
        const id = createId('dev-');
        currentDevs.push({ 
            id, name, 
            email: details?.email || '', 
            phone: details?.phone || '', 
            additionalFields: details?.additionalFields || [] 
        });
        devMap.set(name.toLowerCase(), id);
        return id;
    };

    const ensureTester = (name: string, details?: any) => {
        if (!name || testerMap.has(name.toLowerCase())) return testerMap.get(name.toLowerCase())!;
        const id = createId('tester-');
        currentTesters.push({ 
            id, name, 
            email: details?.email || '', 
            phone: details?.phone || '', 
            additionalFields: details?.additionalFields || [] 
        });
        testerMap.set(name.toLowerCase(), id);
        return id;
    };

    jsonDevs.forEach((d: any) => {
        const name = typeof d === 'string' ? d : d.name;
        ensureDev(name, typeof d === 'object' ? d : undefined);
    });
    jsonTesters.forEach((t: any) => {
        const name = typeof t === 'string' ? t : t.name;
        ensureTester(name, typeof t === 'object' ? t : undefined);
    });

    tasksToImport.forEach((t: any) => {
        (t.developers || []).forEach((name: any) => {
            if (typeof name === 'string') ensureDev(name);
        });
        (t.testers || []).forEach((name: any) => {
            if (typeof name === 'string') ensureTester(name);
        });
    });

    const taskIdMap = new Map<string, string>();
    const processedTasks = [];
    for (const t of tasksToImport) {
        const devIds = (t.developers || []).map((val: any) => {
            if (typeof val !== 'string') return val;
            return devMap.get(val.toLowerCase()) || val;
        }).filter(Boolean);
        
        const testerIds = (t.testers || []).map((val: any) => {
            if (typeof val !== 'string') return val;
            return testerMap.get(val.toLowerCase()) || val;
        }).filter(Boolean);

        const newId = createId('task-');
        if (t.id) taskIdMap.set(t.id, newId);

        processedTasks.push({
            ...t,
            id: newId,
            developers: devIds,
            testers: testerIds,
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
            deletedAt: t.deletedAt || null,
            dueCompletedAt: t.dueCompletedAt || null,
            dueReminderAt: t.dueReminderAt || null,
            dueReminderPreset: t.dueReminderPreset || null,
            dueReminderBackupAt: t.dueReminderBackupAt || null,
            dueReminderBackupPreset: t.dueReminderBackupPreset || null,
            reminder: t.reminder || null,
            reminderExpiresAt: t.reminderExpiresAt || null,
        });
        
        if (processedTasks.length % 100 === 0) await new Promise(r => setTimeout(r, 0));
    }

    const processedNotes = jsonNotes.map((n: any) => ({
        ...n,
        id: createId('note-'),
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt || new Date().toISOString()
    }));

    const processedLogs = jsonLogs.map((l: any) => ({
        ...l,
        id: createId('log-'),
        taskId: l.taskId ? (taskIdMap.get(l.taskId) || l.taskId) : null,
        userName: l.userName || 'Importer',
        timestamp: l.timestamp || new Date().toISOString()
    }));

    const totalOperations = Math.max(processedTasks.length + processedNotes.length + processedLogs.length + 4, 6);
    let completedOps = 0;
    const bumpProgress = () => {
        completedOps++;
        if (onProgress) onProgress(Math.floor((completedOps / totalOperations) * 100));
    };

    try {
        if (mode === 'authenticate') {
            const companyBase = `users/${userId}/companies/${companyId}`;
            
            await setDoc(doc(db, companyBase, 'people', 'developers'), { list: currentDevs });
            bumpProgress();
            await setDoc(doc(db, companyBase, 'people', 'testers'), { list: currentTesters });
            bumpProgress();

            const currentUi = mergeImportedUiConfig(getUiConfig(), parsedJson, currentDevs, currentTesters);
            await setDoc(doc(db, companyBase, 'settings', 'uiConfig'), sanitizeForFirestore(currentUi));
            bumpProgress();

            const importInBatches = async (items: any[], collectionName: 'tasks' | 'notes' | 'logs') => {
                const chunks = chunkArray(items, 20);
                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const id = item.id;
                        if (!id) return; 
                        
                        const sanitizedItem = sanitizeForFirestore(item);
                        batch.set(doc(db, companyBase, collectionName, id), sanitizedItem);
                        
                        if (collectionName === 'tasks') {
                            const logId = createId('log-');
                            const logEntry = sanitizeForFirestore({
                                id: logId,
                                timestamp: new Date().toISOString(),
                                message: `Imported task "**${item.title}**" via JSON import.`,
                                taskId: id,
                                userId: userId,
                                userName: userName
                            });
                            batch.set(doc(db, companyBase, 'logs', logId), logEntry);
                        }
                        bumpProgress();
                    });
                    await batch.commit();
                }
            };

            await importInBatches(processedTasks, 'tasks');
            await importInBatches(processedNotes, 'notes');
            await importInBatches(processedLogs, 'logs');
        } else {
            const data = getAppData();
            const comp = data.companyData[companyId];
            
            comp.developers = currentDevs;
            bumpProgress();
            comp.testers = currentTesters;
            bumpProgress();
            
            comp.uiConfig = mergeImportedUiConfig(comp.uiConfig, parsedJson, currentDevs, currentTesters);
            bumpProgress();

            processedTasks.forEach(newTask => {
                comp.tasks.unshift(newTask);
                _addLog(comp, { 
                    message: `Imported task "**${newTask.title}**" via JSON import.`, 
                    taskId: newTask.id,
                    userName: 'Local User'
                });
                bumpProgress();
            });
            
            comp.notes = [...processedNotes, ...comp.notes];
            processedNotes.forEach(() => bumpProgress());
            comp.logs = [...processedLogs, ...comp.logs];
            processedLogs.forEach(() => bumpProgress());

            await assertLocalImportCapacity(data);
            setAppData(data);
            bumpProgress();
        }
    } catch (error: any) {
        console.error("Import Sync Failure:", error);
        if (typeof error?.message === 'string' && error.message.trim()) {
            throw new Error(error.message);
        }
        throw new Error("An error occurred while importing. Please try again later.");
    }
    
    return { 
        success: true, 
        importedCount: processedTasks.length, 
        skippedDuplicates: skippedTasks 
    };
}

export async function clearAllData() {
    const mode = getAuthMode();
    const companyId = getActiveCompanyId();
    try {
        if (mode === 'authenticate') {
            const auth = getAuth();
            const db = getFirestore();
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error("You must be signed in to clear cloud data.");
            
            const companyBase = `users/${userId}/companies/${companyId}`;
            
            const collectionsToClear = ['tasks', 'notes', 'logs'];
            for (const colName of collectionsToClear) {
                const q = query(collection(db, companyBase, colName), limit(500));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const chunks = chunkArray(snap.docs, 50);
                    for (const chunk of chunks) {
                        const batch = writeBatch(db);
                        chunk.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                }
            }
            const batch = writeBatch(db);
            batch.set(doc(db, companyBase, 'people', 'developers'), { list: [] });
            batch.set(doc(db, companyBase, 'people', 'testers'), { list: [] });
            batch.set(doc(db, companyBase, 'reminders', 'general'), { list: [] });
            await batch.commit();
        } else {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('taskflow_')) localStorage.removeItem(key);
            });
            localStorage.removeItem(DATA_KEY);
        }
    } catch (error: any) {
        console.error("Clear Data Error:", error);
        throw new Error("An error occurred while clearing data. Please try again later.");
    }
}

export async function clearStarterContent(): Promise<boolean> {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const companyData = data.companyData[companyId];
    const starterMeta = companyData?.starterContent;

    if (!companyData || !starterMeta?.isAvailable) {
        return false;
    }

    companyData.tasks = companyData.tasks.filter(task => !starterMeta.taskIds.includes(task.id));
    companyData.notes = companyData.notes.filter(note => !starterMeta.noteIds.includes(note.id));
    companyData.taskTemplates = companyData.taskTemplates.filter(template => !starterMeta.templateIds.includes(template.id));
    companyData.developers = companyData.developers.filter(
        developer => !starterMeta.developerIds?.includes(developer.id)
    );
    companyData.testers = companyData.testers.filter(
        tester => !starterMeta.testerIds?.includes(tester.id)
    );
    companyData.uiConfig.repositoryConfigs = companyData.uiConfig.repositoryConfigs.filter(
        repository => !starterMeta.repositoryIds?.includes(repository.id)
    );
    companyData.uiConfig.fields = companyData.uiConfig.fields.map((field) => {
        if (field.key === 'repositories') {
            return {
                ...field,
                options: (field.options || []).filter(
                    option => !starterMeta.repositoryIds?.includes(option.id)
                ),
                defaultValue: undefined,
            };
        }

        if (field.key === 'developers') {
            return {
                ...field,
                options: (field.options || []).filter(
                    option => !starterMeta.developerIds?.includes(option.id)
                ),
                defaultValue: undefined,
            };
        }

        if (field.key === 'testers') {
            return {
                ...field,
                options: (field.options || []).filter(
                    option => !starterMeta.testerIds?.includes(option.id)
                ),
                defaultValue: undefined,
            };
        }

        if (field.key === 'azureWorkItemId' || field.key === 'tags' || field.key === 'relevantEnvironments') {
            return {
                ...field,
                defaultValue: undefined,
            };
        }

        return field;
    });
    companyData.starterContent = {
        ...starterMeta,
        isAvailable: false,
        taskIds: [],
        noteIds: [],
        templateIds: [],
        developerIds: [],
        testerIds: [],
        repositoryIds: [],
    };

    setAppData(data);
    clearAllReadCache();

    const currentPrefs = getUserPreferences();
    const starterSavedIds = currentPrefs.starterSavedTaskViewIds || [];
    await updateUserPreferences({
        savedTaskViews: (currentPrefs.savedTaskViews || []).filter(view => !starterSavedIds.includes(view.id)),
        starterSavedTaskViewIds: [],
        starterContentAvailable: false,
    });

    addLog({ message: 'Removed starter workspace content for a clean first-time setup.' });
    window.dispatchEvent(new Event('notes-updated'));
    window.dispatchEvent(new Event('config-changed'));
    return true;
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunkedArr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
}
