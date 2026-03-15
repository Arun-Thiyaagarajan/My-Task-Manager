
'use client';

import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES, INITIAL_RELEASES } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log, Comment, GeneralReminder, BackupFrequency, Note, NoteLayout, Environment, ReleaseUpdate, ReleaseItem, AuthMode } from './types'; 
import cloneDeep from 'lodash/cloneDeep';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, collection, writeBatch, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const DATA_KEY = 'my_task_manager_data';
const AUTH_MODE_KEY = 'taskflow_auth_mode';

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
                releaseUpdates: [...INITIAL_RELEASES],
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
    } else if (type === 'developers' || type === 'testers') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'people', type);
        payload = { list: data };
    } else if (type === 'generalReminders') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'reminders', 'general');
        payload = { list: data };
    } else if (type === 'releaseUpdates') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'releases', 'updates');
        payload = { list: data };
    } else {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, type, id);
    }

    try {
        if (operation === 'delete') {
            deleteDoc(docRef).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })));
        } else if (operation === 'update') {
            updateDoc(docRef, payload).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: payload })));
        } else {
            setDoc(docRef, payload, { merge: operation === 'set' }).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write', requestResourceData: payload })));
        }
    } catch (e) {
        console.error("Mutation failed:", e);
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
        releaseUpdates: [...INITIAL_RELEASES],
    };
    data.activeCompanyId = id;
    setAppData(data);
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('companies', id, newCompany, 'create');
    }
}

export function updateCompany(id: string, name: string) {
    const data = getAppData();
    const company = data.companies.find(c => c.id === id);
    if (company) {
        company.name = name;
        setAppData(data);
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('companies', id, { name }, 'update');
        }
    }
}

export function deleteCompany(id: string): boolean {
    const data = getAppData();
    if (data.companies.length <= 1) return false;
    data.companies = data.companies.filter(c => c.id !== id);
    delete data.companyData[id];
    if (data.activeCompanyId === id) {
        data.activeCompanyId = data.companies[0].id;
    }
    setAppData(data);
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

// Task Statuses
export function updateTaskStatuses(statuses: string[]) {
    const config = getUiConfig();
    config.taskStatuses = statuses;
    const statusField = config.fields.find(f => f.key === 'status');
    if (statusField) {
        statusField.options = statuses.map(s => ({ id: s, value: s, label: s }));
    }
    setUiConfig(config);
}

// Environments
export function addEnvironment(env: Omit<Environment, 'id'>) {
    const config = getUiConfig();
    const existing = config.environments.find(e => e.name.toLowerCase() === env.name.toLowerCase());
    if (existing) return;
    const newEnv = { ...env, id: `env_${crypto.randomUUID()}` };
    config.environments.push(newEnv);
    const relEnvsField = config.fields.find(f => f.key === 'relevantEnvironments');
    if (relEnvsField) {
        relEnvsField.options = config.environments.map(e => ({ id: e.id, value: e.name, label: e.name }));
    }
    setUiConfig(config);
    addLog({ message: `Added new environment: **${env.name}**` });
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
        data.companyData[companyId].developers[index] = { ...data.companyData[companyId].developers[index], ...updates };
        setAppData(data);
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('developers', '', data.companyData[companyId].developers, 'set');
        }
    }
}

export function deleteDeveloper(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    data.companyData[companyId].developers = data.companyData[companyId].developers.filter(p => p.id !== id);
    setAppData(data);
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
        data.companyData[companyId].testers[index] = { ...data.companyData[companyId].testers[index], ...updates };
        setAppData(data);
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('testers', '', data.companyData[companyId].testers, 'set');
        }
    }
}

export function deleteTester(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    data.companyData[companyId].testers = data.companyData[companyId].testers.filter(p => p.id !== id);
    setAppData(data);
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('testers', '', data.companyData[companyId].testers, 'set');
    }
    return true;
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
    addLog({ message: `Created task "**${newTask.title}**"`, taskId: id });
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('tasks', id, newTask, 'create');
    }
    return newTask;
}

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
        const changes: string[] = [];
        if (updates.title && updates.title !== oldTask.title) changes.push(`renamed to "**${updates.title}**"`);
        if (updates.status && updates.status !== oldTask.status) changes.push(`changed status to "**${updates.status}**"`);
        if (changes.length > 0) {
            addLog({ message: `Task "**${newTask.title}**" ${changes.join(' and ')}`, taskId: id });
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

// Bulk Task Operations
export function moveMultipleTasksToBin(ids: string[]) {
    ids.forEach(id => moveTaskToBin(id));
}

export function restoreMultipleTasks(ids: string[]) {
    ids.forEach(id => restoreTask(id));
}

export function permanentlyDeleteMultipleTasks(ids: string[]) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    data.companyData[companyId].trash = data.companyData[companyId].trash.filter(t => !ids.includes(t.id));
    setAppData(data);
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
    addLog({ message: `Applied tags [${tagsToAdd.join(', ')}] to ${taskIds.length} task(s).` });
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
        data.companyData[companyId].notes[index] = { ...data.companyData[companyId].notes[index], ...updates, updatedAt: new Date().toISOString() };
        setAppData(data);
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('notes', id, data.companyData[companyId].notes[index], 'update');
        }
    }
}

export function deleteNote(id: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    data.companyData[companyId].notes = data.companyData[companyId].notes.filter(n => n.id !== id);
    setAppData(data);
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
    _addLog(data.companyData[companyId]!, log);
    setAppData(data);
}

// General Reminders
export function getGeneralReminders(): GeneralReminder[] {
    return getAppData().companyData[getActiveCompanyId()]?.generalReminders || [];
}

export function addGeneralReminder(text: string) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const id = `rem-${crypto.randomUUID()}`;
    const newRem = { id, text, createdAt: new Date().toISOString() };
    data.companyData[companyId].generalReminders.unshift(newRem);
    setAppData(data);
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
        if (t.reminderExpiresAt && new Date(t.reminderExpiresAt) <= now) {
            t.reminder = null;
            t.reminderExpiresAt = null;
            updatedTaskIds.push(t.id);
            unpinnedTaskIds.push(t.id);
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
    if (getAuthMode() === 'authenticate') {
        dispatchMutation('releaseUpdates', '', data.companyData[companyId].releaseUpdates, 'set');
    }
}

export function updateReleaseUpdate(id: string, updates: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    const index = data.companyData[companyId].releaseUpdates.findIndex(r => r.id === id);
    if (index !== -1) {
        data.companyData[companyId].releaseUpdates[index] = { ...data.companyData[companyId].releaseUpdates[index], ...updates };
        setAppData(data);
        if (getAuthMode() === 'authenticate') {
            dispatchMutation('releaseUpdates', '', data.companyData[companyId].releaseUpdates, 'set');
        }
    }
}

export function deleteReleaseUpdate(id: string): boolean {
    const data = getAppData();
    const companyId = getActiveCompanyId();
    data.companyData[companyId].releaseUpdates = data.companyData[companyId].releaseUpdates.filter(r => r.id !== id);
    setAppData(data);
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
        return updateTask(taskId, { comments }, true);
    }
    return null;
}

export function updateComment(taskId: string, index: number, text: string): Task | null {
    const task = getTaskById(taskId);
    if (task && task.comments && task.comments[index]) {
        const comments = [...task.comments];
        comments[index] = { ...comments[index], text };
        return updateTask(taskId, { comments }, true);
    }
    return null;
}

export function deleteComment(taskId: string, index: number): Task | null {
    const task = getTaskById(taskId);
    if (task && task.comments && task.comments[index]) {
        const comments = task.comments.filter((_, i) => i !== index);
        return updateTask(taskId, { comments }, true);
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
    if (mode === 'authenticate' && !userId) throw new Error("User not authenticated.");
    const tasks = Array.isArray(parsedJson.tasks) ? parsedJson.tasks : [];
    const devs = Array.isArray(parsedJson.developers) ? parsedJson.developers : [];
    const testers = Array.isArray(parsedJson.testers) ? parsedJson.testers : [];
    const notes = Array.isArray(parsedJson.notes) ? parsedJson.notes : [];
    const repoConfigs = Array.isArray(parsedJson.repositoryConfigs) ? parsedJson.repositoryConfigs : [];
    const envs = Array.isArray(parsedJson.environments) ? parsedJson.environments : [];
    const total = tasks.length + devs.length + testers.length + notes.length;
    let completed = 0;
    const reportProgress = () => {
        completed++;
        if (onProgress) onProgress(Math.floor((completed / total) * 100));
    };
    if (mode === 'authenticate') {
        const companyBase = `users/${userId}/companies/${companyId}`;
        if (devs.length > 0) {
            const current = getDevelopers();
            const merged = [...current];
            devs.forEach(d => { if (!merged.some(m => m.name === d.name)) merged.push({ ...d, id: `dev-${crypto.randomUUID()}` }); });
            await setDoc(doc(db, companyBase, 'people', 'developers'), { list: merged });
        }
        if (testers.length > 0) {
            const current = getTesters();
            const merged = [...current];
            testers.forEach(t => { if (!merged.some(m => m.name === t.name)) merged.push({ ...t, id: `tester-${crypto.randomUUID()}` }); });
            await setDoc(doc(db, companyBase, 'people', 'testers'), { list: merged });
        }
        const currentUi = getUiConfig();
        if (repoConfigs.length > 0) {
            const mergedRepos = [...currentUi.repositoryConfigs];
            repoConfigs.forEach(r => { if (!mergedRepos.some(mr => mr.name === r.name)) mergedRepos.push({ ...r, id: `repo_${crypto.randomUUID()}` }); });
            currentUi.repositoryConfigs = mergedRepos;
        }
        if (envs.length > 0) {
            const mergedEnvs = [...currentUi.environments];
            envs.forEach(e => { if (!mergedEnvs.some(me => me.name.toLowerCase() === e.name.toLowerCase())) mergedEnvs.push({ ...e, id: `env_${crypto.randomUUID()}` }); });
            currentUi.environments = mergedEnvs;
        }
        await setDoc(doc(db, companyBase, 'settings', 'uiConfig'), currentUi);
        const processItems = async (items: any[], type: 'tasks' | 'notes') => {
            const chunks = chunkArray(items, 20);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(item => {
                    const id = item.id || `${type.slice(0,-1)}-${crypto.randomUUID()}`;
                    batch.set(doc(db, companyBase, type, id), { 
                        ...item, id, 
                        createdAt: item.createdAt || new Date().toISOString(), 
                        updatedAt: item.updatedAt || new Date().toISOString() 
                    }, { merge: true });
                    reportProgress();
                });
                await batch.commit();
            }
        };
        await processItems(tasks, 'tasks');
        await processItems(notes, 'notes');
    } else {
        const data = getAppData();
        const comp = data.companyData[companyId];
        const uniqueTasks = tasks.filter(nt => !comp.tasks.some(et => et.title === nt.title));
        comp.tasks = [...uniqueTasks, ...comp.tasks];
        const uniqueNotes = notes.filter(nn => !comp.notes.some(en => en.title === nn.title && en.content === nn.content));
        comp.notes = [...uniqueNotes, ...comp.notes];
        devs.forEach(d => { if (!comp.developers.some(m => m.name === d.name)) comp.developers.push({ ...d, id: `dev-${crypto.randomUUID()}` }); });
        testers.forEach(t => { if (!comp.testers.some(m => m.name === t.name)) comp.testers.push({ ...t, id: `tester-${crypto.randomUUID()}` }); });
        if (repoConfigs.length > 0) {
            repoConfigs.forEach(r => { if (!comp.uiConfig.repositoryConfigs.some(mr => mr.name === r.name)) comp.uiConfig.repositoryConfigs.push({ ...r, id: `repo_${crypto.randomUUID()}` }); });
        }
        if (envs.length > 0) {
            envs.forEach(e => { if (!comp.uiConfig.environments.some(me => me.name.toLowerCase() === e.name.toLowerCase())) comp.uiConfig.environments.push({ ...e, id: `env_${crypto.randomUUID()}` }); });
        }
        setAppData(data);
    }
    return true;
}

export async function clearAllData() {
    const mode = getAuthMode();
    const companyId = getActiveCompanyId();
    if (mode === 'authenticate') {
        const auth = getAuth();
        const db = getFirestore();
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const companyBase = `users/${userId}/companies/${companyId}`;
        try {
            const currentConfig = getUiConfig();
            const preservedEnvs = currentConfig.environments || [];
            const preservedAppName = currentConfig.appName;
            const preservedAppIcon = currentConfig.appIcon;
            const resetFields = INITIAL_UI_CONFIG.map(f => {
                if (f.key === 'status') {
                    return { ...f, options: TASK_STATUSES.map(s => ({id: s, value: s, label: s})) };
                }
                if (f.key === 'relevantEnvironments') {
                    return { ...f, options: preservedEnvs.map(e => ({id: e.id, value: e.name, label: e.name})) };
                }
                return f;
            });
            const defaultUiConfig: UiConfig = {
                fields: resetFields,
                environments: preservedEnvs,
                repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
                taskStatuses: [...TASK_STATUSES],
                appName: preservedAppName || 'My Task Manager',
                appIcon: preservedAppIcon,
                remindersEnabled: true,
                tutorialEnabled: true,
                timeFormat: '12h',
                autoBackupFrequency: 'weekly',
                autoBackupTime: 6,
                currentVersion: '1.1.0',
                authenticationMode: 'authenticate',
            };
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
            batch.set(doc(db, companyBase, 'settings', 'uiConfig'), defaultUiConfig);
            batch.set(doc(db, companyBase, 'releases', 'updates'), { list: [...INITIAL_RELEASES] });
            await batch.commit();
        } catch (error: any) {
            console.error("Critical error during cloud data clearing:", error);
            throw new Error(`Data clearing failed: ${error.message}`);
        }
    } else {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('taskflow_')) localStorage.removeItem(key);
        });
        localStorage.removeItem(DATA_KEY);
    }
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunkedArr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
}
