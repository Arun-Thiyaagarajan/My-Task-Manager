'use client';

import { INITIAL_RELEASES, INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES, DEFAULT_STATUS_CONFIGS } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log, Comment, GeneralReminder, BackupFrequency, Note, NoteLayout, Environment, ReleaseUpdate, ReleaseItem, AuthMode, UserPreferences, LocalProfile, Feedback, FeedbackMessage, FeedbackStatus, UserProfile, AppNotification, StatusConfigItem } from './types'; 
import cloneDeep from 'lodash/cloneDeep';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, collection, writeBatch, getDocs, query, orderBy, limit, getDoc, where, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';
import { syncTaskStatuses } from './status-config';
import { createId } from './id';

export const DATA_KEY = 'my_task_manager_data';
const AUTH_MODE_KEY = 'taskflow_auth_mode';
const PREFERENCES_KEY = 'taskflow_user_preferences';

// Central In-Memory Cache for Real-time Cloud Data
let _cloudCache: MyTaskManagerData | null = null;
let _initialSyncStatus: Record<string, boolean> = {}; // companyId -> status

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

const getInitialData = (): MyTaskManagerData => {
    const defaultCompanyId = `company-default`;
    const initialFields = INITIAL_UI_CONFIG.map(f => {
        if (f.key === 'status') {
            return { ...f, options: TASK_STATUSES.map(s => ({id: s, value: s, label: s})) };
        }
        if (f.key === 'relevantEnvironments') {
            return { ...f, options: ENVIRONMENTS.map(e => ({ id: e.id, value: e.name, label: e.name})) };
        }
        return f;
    });

    return {
        companies: [{ id: defaultCompanyId, name: 'Default Company' }],
        activeCompanyId: defaultCompanyId,
        companyData: {
             [defaultCompanyId]: {
                tasks: [],
                trash: [],
                developers: [],
                testers: [],
                notes: [],
                uiConfig: syncTaskStatuses({ 
                    fields: initialFields,
                    environments: [...ENVIRONMENTS],
                    repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
                    taskStatuses: [...TASK_STATUSES],
                    statusConfigs: [...DEFAULT_STATUS_CONFIGS],
                    appName: 'My Task Manager',
                    appIcon: null,
                    remindersEnabled: true,
                    tutorialEnabled: true,
                    timeFormat: '12h',
                    autoBackupFrequency: 'weekly',
                    autoBackupTime: 6,
                    currentVersion: '1.1.0',
                    authenticationMode: 'localStorage',
                }),
                logs: [],
                generalReminders: [],
                releaseUpdates: [...INITIAL_RELEASES],
            },
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
    if (!stored) return getInitialData();
    try {
        return JSON.parse(stored);
    } catch (e) {
        return getInitialData();
    }
};

export const setAppData = (data: MyTaskManagerData) => {
    if (typeof window === 'undefined') return;
    if (getAuthMode() === 'authenticate') {
        _cloudCache = data;
    } else {
        window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
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
    window.dispatchEvent(new Event('company-changed'));
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
    if (!stored) return {};
    try {
        return JSON.parse(stored);
    } catch (e) {
        return {};
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
    type: 'tasks' | 'notes' | 'logs' | 'uiConfig' | 'developers' | 'testers' | 'generalReminders' | 'releaseUpdates' | 'companies' | 'feedback' | 'feedbackMessages' | 'notifications',
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
    
    if (!userId && (type !== 'feedback' && type !== 'feedbackMessages' && type !== 'notifications')) return;

    let docRef;
    let payload = data;

    if (type === 'companies') {
        docRef = doc(db, 'users', userId!, 'companies', id);
    } else if (type === 'uiConfig') {
        docRef = doc(db, 'users', userId!, 'companies', activeCompanyId, 'settings', 'uiConfig');
    } else if (type === 'developers' || type === 'testers' || type === 'generalReminders' || type === 'releaseUpdates') {
        const parentMap: Record<string, string> = {
            developers: 'people',
            testers: 'people',
            generalReminders: 'reminders',
            releaseUpdates: 'releases'
        };
        const docNameMap: Record<string, string> = {
            developers: 'developers',
            testers: 'testers',
            generalReminders: 'general',
            releaseUpdates: 'updates'
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
            ? JSON.parse(JSON.stringify(payload)) 
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
        // Issue delete mutations for Firestore items
        expired.forEach(n => {
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

export function getRecentImportedTasks(limitCount = 5): Task[] {
    const logs = getLogs();
    const tasks = getTasks();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const importedTaskIds = new Set(
        logs
            .filter(l => l.taskId && l.message.includes('Imported task') && new Date(l.timestamp) >= sevenDaysAgo)
            .map(l => l.taskId!)
    );

    return tasks
        .filter(t => importedTaskIds.has(t.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
        ...task,
        id, createdAt: now, updatedAt: now
    } as Task;
    data.companyData[companyId].tasks.unshift(newTask);
    setAppData(data);
    
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
    }
    return { updatedTaskIds, unpinnedTaskIds };
}

// Release Updates
export function getReleaseUpdates(publishedOnly = true): ReleaseUpdate[] {
    const appData = getAppData();
    const companyId = getActiveCompanyId();
    if (!companyId || !appData.companyData[companyId]) return [];
    const all = appData.companyData[companyId].releaseUpdates || [];
    if (publishedOnly) return all.filter(r => r.isPublished).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return [...all].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addReleaseUpdate(release: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = createId('rel-');
    const now = new Date().toISOString();
    const newRel = { id, version: '', title: '', items: [], date: now, isPublished: false, ...release } as ReleaseUpdate;
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
        data.companyData[companyId].releaseUpdates[index] = { ...data.companyData[companyId].releaseUpdates[index], ...updates };
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
            deletedAt: t.deletedAt || null 
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

    const totalOperations = processedTasks.length + processedNotes.length + processedLogs.length + 3;
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
            await setDoc(doc(db, companyBase, 'settings', 'uiConfig'), currentUi);
            bumpProgress();

            const importInBatches = async (items: any[], collectionName: 'tasks' | 'notes' | 'logs') => {
                const chunks = chunkArray(items, 20);
                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const id = item.id;
                        if (!id) return; 
                        
                        const sanitizedItem = JSON.parse(JSON.stringify(item));
                        batch.set(doc(db, companyBase, collectionName, id), sanitizedItem);
                        
                        if (collectionName === 'tasks') {
                            const logId = createId('log-');
                            const logEntry = JSON.parse(JSON.stringify({
                                id: logId,
                                timestamp: new Date().toISOString(),
                                message: `Imported task "**${item.title}**" from external source.`,
                                taskId: id,
                                userId: userId,
                                userName: userName
                            }));
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
            comp.testers = currentTesters;
            
            comp.uiConfig = mergeImportedUiConfig(comp.uiConfig, parsedJson, currentDevs, currentTesters);

            processedTasks.forEach(newTask => {
                comp.tasks.unshift(newTask);
                _addLog(comp, { 
                    message: `Imported task "**${newTask.title}**" from external source.`, 
                    taskId: newTask.id,
                    userName: 'Local User'
                });
            });
            
            comp.notes = [...processedNotes, ...comp.notes];
            comp.logs = [...processedLogs, ...comp.logs];

            setAppData(data);
            if (onProgress) onProgress(100);
        }
    } catch (error: any) {
        console.error("Import Sync Failure:", error);
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
            batch.set(doc(db, companyBase, 'releases', 'updates'), { list: [] });
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

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunkedArr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
}
