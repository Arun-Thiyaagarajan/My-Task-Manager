'use client';

import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES, INITIAL_RELEASES } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log, Comment, GeneralReminder, BackupFrequency, Note, NoteLayout, Environment, ReleaseUpdate, ReleaseItem, AuthMode } from './types';
import cloneDeep from 'lodash/cloneDeep';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, collection } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const DATA_KEY = 'my_task_manager_data';
const AUTH_MODE_KEY = 'taskflow_auth_mode';

// Central In-Memory Cache for Real-time Cloud Data
let _cloudCache: MyTaskManagerData | null = null;

/**
 * Updates the central cloud cache. This is typically called by the useTaskFlowData hook.
 */
export function setCloudCache(data: MyTaskManagerData | null) {
    _cloudCache = data;
}

/**
 * Returns the default initial state for the application.
 */
const getInitialData = (): MyTaskManagerData => {
    const defaultCompanyId = `company-default`;
    const initialFields = INITIAL_UI_CONFIG.map(f => {
        if (f.key === 'status') {
            return { ...f, options: TASK_STATUSES.map(s => ({id: s, value: s, label: s})) };
        }
        if (f.key === 'relevantEnvironments') {
            return { ...f, options: ENVIRONMENTS.map(e => ({id: e.id, value: e.name, label: e.name})) };
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

/**
 * Standardized mode-aware storage fetcher.
 */
export const getAppData = (): MyTaskManagerData => {
    if (getAuthMode() === 'authenticate' && _cloudCache) {
        return _cloudCache;
    }

    if (typeof window === 'undefined') {
        return getInitialData();
    }

    const stored = window.localStorage.getItem(DATA_KEY);
    if (!stored) {
        return getInitialData();
    }

    try {
        const data: MyTaskManagerData = JSON.parse(stored);
        return data;
    } catch (e) {
        return getInitialData();
    }
};

/**
 * Mode-aware storage persistence.
 */
export const setAppData = (data: MyTaskManagerData) => {
    if (typeof window === 'undefined') return;

    if (getAuthMode() === 'authenticate') {
        _cloudCache = data;
    } else {
        window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
    }
    window.dispatchEvent(new StorageEvent('storage', { key: DATA_KEY }));
};

/**
 * Returns the current storage/authentication mode.
 */
export function getAuthMode(): AuthMode {
    if (typeof window === 'undefined') return 'localStorage';
    return (window.localStorage.getItem(AUTH_MODE_KEY) as AuthMode) || 'localStorage';
}

/**
 * Switches the application mode.
 */
export function setAuthMode(mode: AuthMode) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUTH_MODE_KEY, mode);
    window.dispatchEvent(new Event('company-changed'));
}

/**
 * Handles Firestore mutations if in Authenticate mode.
 */
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
    if (type === 'companies') {
        docRef = doc(db, 'users', userId, 'companies', id);
    } else if (type === 'uiConfig') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'settings', 'uiConfig');
    } else if (type === 'developers' || type === 'testers') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'people', type);
    } else if (type === 'generalReminders') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'reminders', 'general');
    } else if (type === 'releaseUpdates') {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, 'releases', 'updates');
    } else {
        docRef = doc(db, 'users', userId, 'companies', activeCompanyId, type, id);
    }

    try {
        if (operation === 'delete') {
            deleteDoc(docRef).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })));
        } else if (operation === 'update') {
            updateDoc(docRef, data).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: data })));
        } else {
            setDoc(docRef, data, { merge: operation === 'set' }).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write', requestResourceData: data })));
        }
    } catch (e) {
        console.error("Mutation failed:", e);
    }
}

/**
 * Adds a log entry to the active company.
 */
function _addLog(companyData: CompanyData, logData: Omit<Log, 'id' | 'timestamp'>) {
    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        ...logData,
    };
    companyData.logs = [newLog, ...(companyData.logs || []).slice(0, 1999)];
    dispatchMutation('logs', newLog.id, newLog, 'set');
}

// --- EXPORTED API FUNCTIONS ---

// Companies
export function getCompanies(): Company[] { return getAppData().companies; }
export function getActiveCompanyId(): string { return getAppData().activeCompanyId; }
export function setActiveCompanyId(id: string) {
    const data = getAppData();
    if (data.companies.some(c => c.id === id)) {
        data.activeCompanyId = id;
        if (getAuthMode() === 'localStorage') setAppData(data);
        window.dispatchEvent(new Event('company-changed'));
    }
}
export function addCompany(name: string): Company {
    const data = getAppData();
    const newId = `company-${crypto.randomUUID()}`;
    const newCompany = { id: newId, name };
    data.companies.push(newCompany);
    data.companyData[newId] = cloneDeep(getInitialData().companyData['company-default']);
    data.companyData[newId].uiConfig.appName = name;
    dispatchMutation('companies', newId, newCompany, 'set');
    setAppData(data);
    return newCompany;
}
export function updateCompany(id: string, name: string) {
    const data = getAppData();
    const company = data.companies.find(c => c.id === id);
    if (company) {
        company.name = name;
        dispatchMutation('companies', id, { id, name }, 'update');
        setAppData(data);
    }
}
export function deleteCompany(id: string) {
    const data = getAppData();
    if (data.companies.length <= 1) return false;
    data.companies = data.companies.filter(c => c.id !== id);
    delete data.companyData[id];
    if (data.activeCompanyId === id) data.activeCompanyId = data.companies[0].id;
    dispatchMutation('companies', id, null, 'delete');
    setAppData(data);
    return true;
}

// Tasks
export function getTasks(): Task[] { return getAppData().companyData[getActiveCompanyId()]?.tasks || []; }
export function getBinnedTasks(): Task[] { return getAppData().companyData[getActiveCompanyId()]?.trash || []; }
export function getTaskById(id: string) { return [...getTasks(), ...getBinnedTasks()].find(t => t.id === id); }
export function addTask(task: Partial<Task>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newTask = {
        id: task.id || `task-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Untitled Task',
        description: '',
        status: 'To Do',
        ...task
    } as Task;
    companyData.tasks.unshift(newTask);
    dispatchMutation('tasks', newTask.id, newTask, 'set');
    _addLog(companyData, { message: `Created task "**${newTask.title}**"`, taskId: newTask.id });
    setAppData(data);
    return newTask;
}
export function updateTask(id: string, task: Partial<Task>, silent = false) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    let listName: 'tasks' | 'trash' = 'tasks';
    let index = companyData.tasks.findIndex(t => t.id === id);
    if (index === -1) { index = companyData.trash.findIndex(t => t.id === id); listName = 'trash'; }
    if (index !== -1) {
        companyData[listName][index] = { ...companyData[listName][index], ...task, updatedAt: new Date().toISOString() };
        dispatchMutation('tasks', id, companyData[listName][index], 'update');
        if (!silent) _addLog(companyData, { message: `Updated task "**${companyData[listName][index].title}**"`, taskId: id });
        setAppData(data);
        return companyData[listName][index];
    }
}
export function moveTaskToBin(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        const [task] = companyData.tasks.splice(index, 1);
        task.deletedAt = new Date().toISOString();
        companyData.trash.unshift(task);
        dispatchMutation('tasks', id, task, 'update');
        _addLog(companyData, { message: `Moved task "**${task.title}**" to bin.`, taskId: id });
        setAppData(data);
    }
}
export function moveMultipleTasksToBin(ids: string[]) { ids.forEach(id => moveTaskToBin(id)); }
export function restoreTask(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.trash.findIndex(t => t.id === id);
    if (index !== -1) {
        const [task] = companyData.trash.splice(index, 1);
        delete task.deletedAt;
        companyData.tasks.unshift(task);
        dispatchMutation('tasks', id, task, 'set');
        _addLog(companyData, { message: `Restored task "**${task.title}**" from bin.`, taskId: id });
        setAppData(data);
    }
}
export function restoreMultipleTasks(ids: string[]) { ids.forEach(id => restoreTask(id)); }
export function permanentlyDeleteTask(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    companyData.trash = companyData.trash.filter(t => t.id !== id);
    dispatchMutation('tasks', id, null, 'delete');
    setAppData(data);
}
export function permanentlyDeleteMultipleTasks(ids: string[]) { ids.forEach(id => permanentlyDeleteTask(id)); }
export function emptyBin() { const binned = getBinnedTasks(); binned.forEach(t => permanentlyDeleteTask(t.id)); }

// People
export function getDevelopers() { return getAppData().companyData[getActiveCompanyId()]?.developers || []; }
export function addDeveloper(p: Partial<Person>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newPerson = { id: `dev-${crypto.randomUUID()}`, name: '', ...p } as Person;
    companyData.developers.push(newPerson);
    dispatchMutation('developers', 'developers', { list: companyData.developers }, 'set');
    setAppData(data);
    return newPerson;
}
export function updateDeveloper(id: string, p: Partial<Person>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.developers.findIndex(x => x.id === id);
    if (index !== -1) {
        companyData.developers[index] = { ...companyData.developers[index], ...p };
        dispatchMutation('developers', 'developers', { list: companyData.developers }, 'set');
        setAppData(data);
    }
}
export function deleteDeveloper(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    companyData.developers = companyData.developers.filter(x => x.id !== id);
    dispatchMutation('developers', 'developers', { list: companyData.developers }, 'set');
    setAppData(data);
    return true;
}
export function getTesters() { return getAppData().companyData[getActiveCompanyId()]?.testers || []; }
export function addTester(p: Partial<Person>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newPerson = { id: `test-${crypto.randomUUID()}`, name: '', ...p } as Person;
    companyData.testers.push(newPerson);
    dispatchMutation('testers', 'testers', { list: companyData.testers }, 'set');
    setAppData(data);
    return newPerson;
}
export function updateTester(id: string, p: Partial<Person>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.testers.findIndex(x => x.id === id);
    if (index !== -1) {
        companyData.testers[index] = { ...companyData.testers[index], ...p };
        dispatchMutation('testers', 'testers', { list: companyData.testers }, 'set');
        setAppData(data);
    }
}
export function deleteTester(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    companyData.testers = companyData.testers.filter(x => x.id !== id);
    dispatchMutation('testers', 'testers', { list: companyData.testers }, 'set');
    setAppData(data);
    return true;
}

// Config & Settings
export function getUiConfig(): UiConfig {
    const data = getAppData();
    return data.companyData[data.activeCompanyId]?.uiConfig || getInitialData().companyData['company-default'].uiConfig;
}
export function updateUiConfig(newConfig: Partial<UiConfig>, isFullReplacement = false) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (isFullReplacement) companyData.uiConfig = newConfig as UiConfig;
    else companyData.uiConfig = { ...companyData.uiConfig, ...newConfig };
    dispatchMutation('uiConfig', 'uiConfig', companyData.uiConfig, 'set');
    setAppData(data);
    window.dispatchEvent(new Event('config-changed'));
}
export function addEnvironment(name: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newEnv = { id: `env-${crypto.randomUUID()}`, name, color: '#3b82f6' };
    companyData.uiConfig.environments.push(newEnv);
    updateUiConfig(companyData.uiConfig, true);
    return true;
}
export function updateEnvironment(oldName: string, env: Environment) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.uiConfig.environments.findIndex(x => x.name === oldName);
    if (index !== -1) {
        companyData.uiConfig.environments[index] = env;
        updateUiConfig(companyData.uiConfig, true);
    }
    return true;
}
export function deleteEnvironment(name: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    companyData.uiConfig.environments = companyData.uiConfig.environments.filter(x => x.name !== name);
    updateUiConfig(companyData.uiConfig, true);
    return true;
}

// Logs
export function getLogs() { return getAppData().companyData[getActiveCompanyId()]?.logs || []; }
export function addLog(logData: Omit<Log, 'id' | 'timestamp'>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return;
    _addLog(companyData, logData);
    setAppData(data);
}
export function getLogsForTask(taskId: string): Log[] {
    return getLogs().filter(log => log.taskId === taskId);
}
export function getAggregatedLogs(): Log[] {
    return getLogs();
}

// Reminders
export function getGeneralReminders() { return getAppData().companyData[getActiveCompanyId()]?.generalReminders || []; }
export function addGeneralReminder(text: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newRem = { id: `rem-${crypto.randomUUID()}`, text, createdAt: new Date().toISOString() };
    companyData.generalReminders.push(newRem);
    dispatchMutation('generalReminders', 'general', { list: companyData.generalReminders }, 'set');
    setAppData(data);
    return newRem;
}
export function updateGeneralReminder(id: string, text: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.generalReminders.findIndex(x => x.id === id);
    if (index !== -1) {
        companyData.generalReminders[index].text = text;
        dispatchMutation('generalReminders', 'general', { list: companyData.generalReminders }, 'set');
        setAppData(data);
    }
}
export function deleteGeneralReminder(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    companyData.generalReminders = companyData.generalReminders.filter(x => x.id !== id);
    dispatchMutation('generalReminders', 'general', { list: companyData.generalReminders }, 'set');
    setAppData(data);
    return true;
}

// Notes
export function getNotes() { return getAppData().companyData[getActiveCompanyId()]?.notes || []; }
export function addNote(note: Partial<Note>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newNote = {
        id: `note-${crypto.randomUUID()}`,
        title: '',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        layout: { i: '', x: 0, y: 0, w: 3, h: 6 },
        ...note
    } as Note;
    newNote.layout.i = newNote.id;
    companyData.notes.unshift(newNote);
    dispatchMutation('notes', newNote.id, newNote, 'set');
    setAppData(data);
    return newNote;
}
export function updateNote(id: string, note: Partial<Note>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.notes.findIndex(x => x.id === id);
    if (index !== -1) {
        companyData.notes[index] = { ...companyData.notes[index], ...note, updatedAt: new Date().toISOString() };
        dispatchMutation('notes', id, companyData.notes[index], 'update');
        setAppData(data);
    }
}
export function deleteNote(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.notes.findIndex(x => x.id === id);
    if (index !== -1) {
        const [note] = companyData.notes.splice(index, 1);
        dispatchMutation('notes', id, null, 'delete');
        // Note trash behavior: move to task bin for safety
        const asTask: Task = { id: note.id, title: `Note: ${note.title || 'Untitled'}`, description: note.content, status: 'Archived', createdAt: note.createdAt, updatedAt: new Date().toISOString(), deletedAt: new Date().toISOString() };
        companyData.trash.unshift(asTask);
        dispatchMutation('tasks', asTask.id, asTask, 'set');
        setAppData(data);
    }
    return true;
}
export function updateNoteLayouts(layouts: NoteLayout[]) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    layouts.forEach(l => {
        const n = companyData.notes.find(x => x.id === l.i);
        if (n) {
            n.layout = { ...n.layout, ...l };
            dispatchMutation('notes', n.id, n, 'update');
        }
    });
    setAppData(data);
}
export function resetNotesLayout() {
    const notes = getNotes();
    notes.forEach((n, i) => {
        n.layout = { i: n.id, x: (i * 3) % 12, y: Math.floor(i / 4) * 6, w: 3, h: 6 };
        dispatchMutation('notes', n.id, n, 'update');
    });
    setAppData(getAppData());
    return true;
}
export function deleteMultipleNotes(ids: string[]) { ids.forEach(id => deleteNote(id)); }
export function importNotes(notes: Partial<Note>[]) { notes.forEach(n => addNote(n)); return getNotes(); }

// Releases
export function getReleaseUpdates(onlyPublished = true) {
    const rels = getAppData().companyData[getActiveCompanyId()]?.releaseUpdates || [];
    return onlyPublished ? rels.filter(r => r.isPublished) : rels;
}
export function addReleaseUpdate(r: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const newRel = { id: `rel-${crypto.randomUUID()}`, version: '', title: '', date: new Date().toISOString(), items: [], isPublished: false, ...r };
    companyData.releaseUpdates.unshift(newRel);
    dispatchMutation('releaseUpdates', 'updates', { list: companyData.releaseUpdates }, 'set');
    setAppData(data);
    return newRel;
}
export function updateReleaseUpdate(id: string, r: Partial<ReleaseUpdate>) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    const index = companyData.releaseUpdates.findIndex(x => x.id === id);
    if (index !== -1) {
        companyData.releaseUpdates[index] = { ...companyData.releaseUpdates[index], ...r };
        dispatchMutation('releaseUpdates', 'updates', { list: companyData.releaseUpdates }, 'set');
        setAppData(data);
    }
}
export function deleteReleaseUpdate(id: string) {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    companyData.releaseUpdates = companyData.releaseUpdates.filter(x => x.id !== id);
    dispatchMutation('releaseUpdates', 'updates', { list: companyData.releaseUpdates }, 'set');
    setAppData(data);
    return true;
}

// Misc
export function clearExpiredReminders() {
    const tasks = getTasks();
    const now = new Date();
    const cleared: string[] = [];
    tasks.forEach(t => {
        if (t.reminderExpiresAt && new Date(t.reminderExpiresAt) < now) {
            updateTask(t.id, { reminder: null, reminderExpiresAt: null }, true);
            cleared.push(t.id);
        }
    });
    return { updatedTaskIds: cleared, unpinnedTaskIds: cleared };
}

export function addTagsToMultipleTasks(taskIds: string[], tags: string[]) {
    taskIds.forEach(id => {
        const task = getTaskById(id);
        if (task) {
            const newTags = Array.from(new Set([...(task.tags || []), ...tags]));
            updateTask(id, { tags: newTags }, true);
        }
    });
}

// Comments
export function addComment(taskId: string, text: string) {
    const comment: Comment = { text, timestamp: new Date().toISOString() };
    const task = getTaskById(taskId);
    if (task) {
        const comments = [...(task.comments || []), comment];
        return updateTask(taskId, { comments });
    }
}
export function updateComment(taskId: string, index: number, text: string) {
    const task = getTaskById(taskId);
    if (task && task.comments && task.comments[index]) {
        const comments = [...task.comments];
        comments[index] = { ...comments[index], text };
        return updateTask(taskId, { comments });
    }
}
export function deleteComment(taskId: string, index: number) {
    const task = getTaskById(taskId);
    if (task && task.comments) {
        const comments = task.comments.filter((_, i) => i !== index);
        return updateTask(taskId, { comments });
    }
}
