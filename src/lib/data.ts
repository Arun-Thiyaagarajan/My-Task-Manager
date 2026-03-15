
'use client';

import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES, INITIAL_RELEASES } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log, Comment, GeneralReminder, BackupFrequency, Note, NoteLayout, Environment, ReleaseUpdate, ReleaseItem, AuthMode, UserPreferences } from './types'; 
import cloneDeep from 'lodash/cloneDeep';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, collection, writeBatch, getDocs, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

export const DATA_KEY = 'my_task_manager_data';
const AUTH_MODE_KEY = 'taskflow_auth_mode';
const PREFERENCES_KEY = 'taskflow_user_preferences';

// Central In-Memory Cache for Real-time Cloud Data
let _cloudCache: MyTaskManagerData | null = null;

export function setCloudCache(data: MyTaskManagerData | null) {
    _cloudCache = data;
}

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
                uiConfig: { 
                    fields: initialFields,
                    environments: [...ENVIRONMENTS],
                    repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
                    taskStatuses: [...TASK_STATUSES],
                    appName: 'My Task Manager',
                    appIcon: null,
                    remindersEnabled: true,
                    tutorialEnabled: true,
                    timeFormat: '12h',
                    autoBackupFrequency: 'weekly',
                    autoBackupTime: 6,
                    currentVersion: '1.1.0',
                    authenticationMode: 'localStorage',
                },
                logs: [],
                generalReminders: [],
                releaseUpdates: [],
            },
        },
    };
};

export const getAppData = (): MyTaskManagerData => {
    if (getAuthMode() === 'authenticate' && _cloudCache) {
        return _cloudCache;
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
    window.dispatchEvent(new Event('company-changed'));
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
            
            // Firestore does not support 'undefined' as a value.
            // We sanitize the object by stringifying and parsing it to remove undefined keys.
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

async function dispatchMutation(
    type: 'tasks' | 'notes' | 'logs' | 'uiConfig' | 'developers' | 'testers' | 'generalReminders' | 'releaseUpdates' | 'companies',
    id: string,
    data: any,
    operation: 'create' | 'update' | 'delete' | 'set'
) {
    if (getAuthMode() !== 'authenticate') return;
    const auth = getAuth();
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    const activeCompanyId = getActiveCompanyId();
    if (!userId) return;

    let docRef;
    let payload = data;

    if (type === 'companies') {
        docRef = doc(db, 'users', userId, 'companies', id);
    } else if (type === 'uiConfig') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'settings', 'uiConfig');
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
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, parentMap[type], docNameMap[type]);
        payload = { list: data };
    } else {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, type, id);
    }

    try {
        // Firestore does not support 'undefined' as a value.
        // We sanitize the payload by stringifying and parsing it to remove undefined keys.
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
            
            if (type === 'logs') {
                toast({ variant: 'destructive', title: 'Logging Failed', description: 'Some changes could not be logged. Please try again.' });
            }
        });
    } catch (e) {
        console.error("Mutation dispatch error:", e);
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
    const id = `company-${crypto.randomUUID()}`;
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
        releaseUpdates: [],
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
    const config = data.companyData[getActiveCompanyId()]?.uiConfig;
    if (!config) return getInitialData().companyData['company-default'].uiConfig;
    return config;
}

export function setUiConfig(config: UiConfig) {
    const data = getAppData();
    data.companyData[getActiveCompanyId()].uiConfig = config;
    setAppData(data);
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('uiConfig', '', config, 'set');
    }
}

// Environment Management
export function addEnvironment(env: Omit<Environment, 'id'>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = `env-${crypto.randomUUID()}`;
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
        
        // Handle renaming across tasks if name changed
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
    // Safeguard mandatory environments
    if (env.isMandatory || ['dev', 'production'].includes(env.name.toLowerCase())) return false;

    data.companyData[companyId].uiConfig.environments = envs.filter(e => e.id !== id);
    
    // Clean up task references
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
    return getAppData().companyData[getActiveCompanyId()]?.developers || [];
}

export function addDeveloper(person: Omit<Person, 'id'>): Person {
    const data = getAppData();
    const id = `dev-${crypto.randomUUID()}`;
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
    return getAppData().companyData[getActiveCompanyId()]?.testers || [];
}

export function addTester(person: Omit<Person, 'id'>): Person {
    const data = getAppData();
    const id = `tester-${crypto.randomUUID()}`;
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
    return getAppData().companyData[getActiveCompanyId()]?.logs || [];
}

export function getLogs(): Log[] {
    return getAggregatedLogs();
}

export function getLogsForTask(taskId: string): Log[] {
    return getAggregatedLogs().filter(l => l.taskId === taskId);
}

function _addLog(companyData: CompanyData, logData: Omit<Log, 'id' | 'timestamp'>) {
    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
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
            userName = 'Local User';
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
    return getAppData().companyData[getActiveCompanyId()]?.tasks || [];
}

export function getTaskById(id: string): Task | undefined {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    return data.companyData[companyId]?.tasks.find(t => t.id === id) || 
           data.companyData[companyId]?.trash.find(t => t.id === id);
}

export function addTask(task: Partial<Task>): Task {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = `task-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const newTask: Task = {
        title: '', description: '', status: 'To Do',
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

    const task = data.companyData[companyId].trash.splice(taskIndex, 1)[0];
    delete task.deletedAt;
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
    ids.forEach(id => restoreTask(id));
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
    const data = getAppData();
    const companyId = getActiveCompanyId();
    return data.companyData[companyId]?.trash || [];
}

// Notes
export function getNotes(): Note[] {
    return getAppData().companyData[getActiveCompanyId()]?.notes || [];
}

export function addNote(note: Partial<Note>): Note {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = `note-${crypto.randomUUID()}`;
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
    return getAppData().companyData[getActiveCompanyId()]?.generalReminders || [];
}

export function addGeneralReminder(text: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = `rem-${crypto.randomUUID()}`;
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
    const all = getAppData().companyData[getActiveCompanyId()]?.releaseUpdates || [];
    if (publishedOnly) return all.filter(r => r.isPublished).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return [...all].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addReleaseUpdate(release: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = `rel-${crypto.randomUUID()}`;
    const newRel = { id, version: '', title: '', items: [], date: new Date().toISOString(), isPublished: false, ...release } as ReleaseUpdate;
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
        rawTasks = Array.isArray(parsedJson.tasks) ? parsedJson.tasks : [];
        jsonDevs = Array.isArray(parsedJson.developers) ? parsedJson.developers : [];
        jsonTesters = Array.isArray(parsedJson.testers) ? parsedJson.testers : [];
        jsonNotes = Array.isArray(parsedJson.notes) ? parsedJson.notes : [];
        jsonLogs = Array.isArray(parsedJson.logs) ? parsedJson.logs : [];
        repoConfigs = Array.isArray(parsedJson.repositoryConfigs) ? parsedJson.repositoryConfigs : [];
        envs = Array.isArray(parsedJson.environments) ? parsedJson.environments : [];
    } catch (e) {
        throw new Error("The imported file is invalid or corrupted. Please check the file format.");
    }

    let currentDevs = [...getDevelopers()];
    let currentTesters = [...getTesters()];

    const devMap = new Map<string, string>(currentDevs.map(d => [d.name.toLowerCase(), d.id]));
    const testerMap = new Map<string, string>(currentTesters.map(t => [t.name.toLowerCase(), t.id]));

    const ensureDev = (name: string, details?: any) => {
        if (!name || devMap.has(name.toLowerCase())) return devMap.get(name.toLowerCase())!;
        const id = `dev-${crypto.randomUUID()}`;
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
        const id = `tester-${crypto.randomUUID()}`;
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

    rawTasks.forEach((t: any) => {
        (t.developers || []).forEach((name: any) => {
            if (typeof name === 'string') ensureDev(name);
        });
        (t.testers || []).forEach((name: any) => {
            if (typeof name === 'string') ensureTester(name);
        });
    });

    const taskIdMap = new Map<string, string>();
    const processedTasks = rawTasks.map((t: any) => {
        const devIds = (t.developers || []).map((val: any) => {
            if (typeof val !== 'string') return val;
            return devMap.get(val.toLowerCase()) || val;
        }).filter(Boolean);
        
        const testerIds = (t.testers || []).map((val: any) => {
            if (typeof val !== 'string') return val;
            return testerMap.get(val.toLowerCase()) || val;
        }).filter(Boolean);

        const newId = `task-${crypto.randomUUID()}`;
        if (t.id) taskIdMap.set(t.id, newId);

        return {
            ...t,
            id: newId,
            developers: devIds,
            testers: testerIds,
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
            deletedAt: null 
        };
    });

    const processedLogs = jsonLogs.map((l: any) => ({
        ...l,
        id: `log-${crypto.randomUUID()}`,
        taskId: l.taskId ? (taskIdMap.get(l.taskId) || l.taskId) : undefined,
        userName: l.userName || 'Imported User'
    }));

    const totalOperations = processedTasks.length + jsonNotes.length + processedLogs.length + 3;
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

            const currentUi = getUiConfig();
            if (repoConfigs.length > 0) {
                repoConfigs.forEach((r: any) => {
                    if (!currentUi.repositoryConfigs.some(mr => mr.name === r.name)) {
                        currentUi.repositoryConfigs.push({ ...r, id: r.id || `repo_${crypto.randomUUID()}` });
                    }
                });
            }
            if (envs.length > 0) {
                envs.forEach((e: any) => {
                    if (!currentUi.environments.some(me => me.name.toLowerCase() === e.name.toLowerCase())) {
                        currentUi.environments.push({ ...e, id: e.id || `env_${crypto.randomUUID()}` });
                    }
                });
            }
            await setDoc(doc(db, companyBase, 'settings', 'uiConfig'), currentUi);
            bumpProgress();

            const importInBatches = async (items: any[], collectionName: 'tasks' | 'notes' | 'logs') => {
                const chunks = chunkArray(items, 20);
                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const id = item.id;
                        batch.set(doc(db, companyBase, collectionName, id), item);
                        
                        if (collectionName === 'tasks') {
                            const logId = `log-${crypto.randomUUID()}`;
                            const logEntry = {
                                id: logId,
                                timestamp: new Date().toISOString(),
                                message: `Imported task "**${item.title}**" from external source.`,
                                taskId: id,
                                userId: userId,
                                userName: userName
                            };
                            batch.set(doc(db, companyBase, 'logs', logId), logEntry);
                        }
                        bumpProgress();
                    });
                    await batch.commit();
                }
            };

            await importInBatches(processedTasks, 'tasks');
            await importInBatches(jsonNotes, 'notes');
            await importInBatches(processedLogs, 'logs');
        } else {
            const data = getAppData();
            const comp = data.companyData[companyId];
            
            comp.developers = currentDevs;
            comp.testers = currentTesters;
            
            processedTasks.forEach(newTask => {
                comp.tasks.unshift(newTask);
                _addLog(comp, { 
                    message: `Imported task "**${newTask.title}**" from external source.`, 
                    taskId: newTask.id,
                    userName: 'Local User'
                });
            });
            
            comp.notes = [...jsonNotes.map(n => ({...n, id: `note-${crypto.randomUUID()}`})), ...comp.notes];
            comp.logs = [...processedLogs, ...comp.logs];

            if (repoConfigs.length > 0) {
                repoConfigs.forEach((r: any) => {
                    if (!comp.uiConfig.repositoryConfigs.some(mr => mr.name === r.name)) {
                        comp.uiConfig.repositoryConfigs.push({ ...r, id: r.id || `repo_${crypto.randomUUID()}` });
                    }
                });
            }
            if (envs.length > 0) {
                envs.forEach((e: any) => {
                    if (!comp.uiConfig.environments.some(me => me.name.toLowerCase() === e.name.toLowerCase())) {
                        comp.uiConfig.environments.push({ ...e, id: e.id || `env_${crypto.randomUUID()}` });
                    }
                });
            }
            
            setAppData(data);
            if (onProgress) onProgress(100);
        }
    } catch (error: any) {
        console.error("Import Sync Failure:", error);
        throw new Error("An error occurred while importing. Please try again later.");
    }
    return true;
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
