
import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig } from './types';
import cloneDeep from 'lodash/cloneDeep';

interface CompanyData {
    tasks: Task[];
    developers: Person[];
    testers: Person[];
    uiConfig: UiConfig;
}

interface MyTaskManagerData {
    companies: Company[];
    activeCompanyId: string;
    companyData: {
        [companyId: string]: CompanyData;
    };
}

const DATA_KEY = 'my_task_manager_data';

const getInitialData = (): MyTaskManagerData => {
    const defaultCompanyId = `company-${crypto.randomUUID()}`;
    const initialFields = INITIAL_UI_CONFIG.map(f => {
        if (f.key === 'status') {
            return { ...f, options: TASK_STATUSES.map(s => ({id: s, value: s, label: s})) };
        }
        return f;
    });

    return {
        companies: [{ id: defaultCompanyId, name: 'Default Company' }],
        activeCompanyId: defaultCompanyId,
        companyData: {
            [defaultCompanyId]: {
                tasks: [],
                developers: [],
                testers: [],
                uiConfig: { 
                    fields: initialFields,
                    environments: [...ENVIRONMENTS],
                    coreEnvironments: [...ENVIRONMENTS],
                    repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
                    taskStatuses: [...TASK_STATUSES],
                    coreTaskStatuses: [...TASK_STATUSES],
                },
            },
        },
    };
};

const getAppData = (): MyTaskManagerData => {
    if (typeof window === 'undefined') {
        const defaultConfig: UiConfig = { 
            fields: INITIAL_UI_CONFIG,
            environments: [...ENVIRONMENTS],
            coreEnvironments: [...ENVIRONMENTS],
            repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
            taskStatuses: [...TASK_STATUSES],
            coreTaskStatuses: [...TASK_STATUSES],
        };
        return {
            companies: [{ id: 'company-placeholder', name: 'Default Company' }],
            activeCompanyId: 'company-placeholder',
            companyData: {
                'company-placeholder': {
                    tasks: [],
                    developers: [],
                    testers: [],
                    uiConfig: defaultConfig,
                },
            },
        };
    }
    const stored = window.localStorage.getItem(DATA_KEY);
    if (!stored) {
        const initialData = getInitialData();
        window.localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
        return initialData;
    }
    try {
        const data: MyTaskManagerData = JSON.parse(stored);
        if (!data.companies || !data.companyData || data.companies.length === 0) {
            throw new Error("Invalid core data structure, resetting.");
        }
        return data;
    } catch (e) {
        console.error(`Error with localStorage data, resetting:`, e);
        const initialData = getInitialData();
        window.localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
        return initialData;
    }
};

const setAppData = (data: MyTaskManagerData) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
};

// Company Functions
export function getCompanies(): Company[] {
    const data = getAppData();
    return data.companies;
}

export function addCompany(name: string): Company {
    const data = getAppData();
    const newCompanyId = `company-${crypto.randomUUID()}`;
    const newCompany: Company = { id: newCompanyId, name };
    
    data.companies.push(newCompany);
    data.companyData[newCompanyId] = getInitialData().companyData[Object.keys(getInitialData().companyData)[0]];
    data.activeCompanyId = newCompanyId;

    setAppData(data);
    return newCompany;
}

export function updateCompany(id: string, name: string): Company | undefined {
    const data = getAppData();
    const companyIndex = data.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return undefined;
    
    data.companies[companyIndex].name = name;
    setAppData(data);
    return data.companies[companyIndex];
}

export function deleteCompany(id: string): boolean {
    const data = getAppData();
    if (data.companies.length <= 1) return false;

    const companyIndex = data.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return false;

    delete data.companyData[id];
    data.companies.splice(companyIndex, 1);

    if (data.activeCompanyId === id) {
        data.activeCompanyId = data.companies[0].id;
    }
    
    setAppData(data);
    return true;
}

export function getActiveCompanyId(): string {
    return getAppData().activeCompanyId;
}

export function setActiveCompanyId(id: string) {
    const data = getAppData();
    if (data.companies.some(c => c.id === id)) {
        data.activeCompanyId = id;
        setAppData(data);
    }
}

/**
 * Safely merges a user's saved UI configuration with the application's default configuration.
 * This is a non-destructive operation that prioritizes the user's saved data and only adds
 * default values for properties that are missing, ensuring customizations are preserved during updates.
 * @param savedConfig The user's configuration object from localStorage.
 * @returns A complete, valid, and safe UiConfig object.
 */
function _validateAndMigrateConfig(savedConfig: Partial<UiConfig> | undefined): UiConfig {
    const defaultConfig: UiConfig = {
        fields: INITIAL_UI_CONFIG,
        environments: [...ENVIRONMENTS],
        coreEnvironments: [...ENVIRONMENTS],
        repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
        taskStatuses: [...TASK_STATUSES],
        coreTaskStatuses: [...TASK_STATUSES],
    };

    if (!savedConfig || typeof savedConfig !== 'object') {
        return cloneDeep(defaultConfig);
    }

    const resultConfig = cloneDeep(defaultConfig);

    // Merge arrays, prioritizing saved data if it's a valid array.
    if (Array.isArray(savedConfig.environments)) resultConfig.environments = cloneDeep(savedConfig.environments);
    if (Array.isArray(savedConfig.repositoryConfigs)) resultConfig.repositoryConfigs = cloneDeep(savedConfig.repositoryConfigs);
    if (Array.isArray(savedConfig.coreEnvironments)) resultConfig.coreEnvironments = cloneDeep(savedConfig.coreEnvironments);
    
    // For statuses, we prioritize the default list now to enforce the predefined set.
    resultConfig.taskStatuses = [...TASK_STATUSES];
    resultConfig.coreTaskStatuses = [...TASK_STATUSES];

    // Ensure core envs are always present in the main envs list without removing user additions.
    const finalEnvs = new Set(resultConfig.environments);
    resultConfig.coreEnvironments.forEach(env => finalEnvs.add(env));
    resultConfig.environments = Array.from(finalEnvs);
    
    // Merge fields carefully.
    if (Array.isArray(savedConfig.fields)) {
        const finalFields: FieldConfig[] = [];
        const savedFieldsMap = new Map((savedConfig.fields).map(f => [f.key, f]));

        defaultConfig.fields.forEach(defaultField => {
            const savedField = savedFieldsMap.get(defaultField.key);
            if (savedField) {
                finalFields.push({ ...defaultField, ...savedField });
                savedFieldsMap.delete(defaultField.key);
            } else {
                finalFields.push(defaultField);
            }
        });

        savedFieldsMap.forEach(customField => {
            if (customField.isCustom) {
                finalFields.push(customField);
            }
        });
        resultConfig.fields = finalFields;
    }
    
    // Post-merge synchronization to ensure UI consistency
    const statusField = resultConfig.fields.find(f => f.key === 'status');
    if (statusField) {
        statusField.options = resultConfig.taskStatuses.map(s => ({ id: s, value: s, label: s }));
    }
    const repoField = resultConfig.fields.find(f => f.key === 'repositories');
    if (repoField) {
        repoField.options = resultConfig.repositoryConfigs.map(r => ({ id: r.id, value: r.name, label: r.name }));
    }
    
    resultConfig.fields
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .forEach((field, index) => {
            field.order = index;
        });

    return resultConfig;
}

// UI Config Functions
export function getUiConfig(): UiConfig {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    const companyData = data.companyData[activeCompanyId];
    
    const validatedConfig = _validateAndMigrateConfig(companyData?.uiConfig);

    if (JSON.stringify(validatedConfig) !== JSON.stringify(companyData?.uiConfig)) {
        updateUiConfig(validatedConfig);
    }
    
    return validatedConfig;
}

export function updateUiConfig(newConfig: UiConfig): UiConfig {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    if (data.companyData[activeCompanyId]) {
        newConfig.fields.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        newConfig.fields.forEach((field, index) => {
            field.order = index;
        });

        data.companyData[activeCompanyId].uiConfig = newConfig;
        setAppData(data);
        window.dispatchEvent(new Event('config-changed'));
    }
    return newConfig;
}

export function updateEnvironmentName(oldName: string, newName: string): boolean {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (!companyData || !companyData.uiConfig.environments?.includes(oldName) || newName.trim() === '' || companyData.uiConfig.environments.includes(newName)) {
        return false;
    }

    const { uiConfig, tasks } = companyData;
    const envIndex = uiConfig.environments.indexOf(oldName);
    uiConfig.environments[envIndex] = newName;

    if (uiConfig.coreEnvironments) {
        const coreEnvIndex = uiConfig.coreEnvironments.indexOf(oldName);
        if (coreEnvIndex > -1) {
            uiConfig.coreEnvironments[coreEnvIndex] = newName;
        }
    }
    
    tasks.forEach(task => {
        let changed = false;
        if (task.deploymentStatus && oldName in task.deploymentStatus) {
            task.deploymentStatus[newName] = task.deploymentStatus[oldName];
            delete task.deploymentStatus[oldName];
            changed = true;
        }
        if (task.deploymentDates && oldName in task.deploymentDates) {
            task.deploymentDates[newName] = task.deploymentDates[oldName];
            delete task.deploymentDates[oldName];
            changed = true;
        }
        if (task.prLinks && oldName in task.prLinks) {
            task.prLinks[newName] = task.prLinks[oldName];
            delete task.prLinks[oldName];
            changed = true;
        }
        if(changed) {
          task.updatedAt = new Date().toISOString();
        }
    });

    data.companyData[activeCompanyId] = { ...companyData, uiConfig, tasks };
    setAppData(data);
    window.dispatchEvent(new Event('config-changed'));
    return true;
}

// Task Functions
export function getTasks(): Task[] {
  const data = getAppData();
  if (!data.activeCompanyId || !data.companyData[data.activeCompanyId]) {
      return [];
  }
  return data.companyData[data.activeCompanyId].tasks;
}

export function getTaskById(id: string): Task | undefined {
  const tasks = getTasks();
  return tasks.find(task => task.id === id);
}

export function addTask(taskData: Partial<Task>): Task {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  const companyTasks = data.companyData[activeCompanyId]?.tasks || [];
  
  const now = new Date().toISOString();
  const taskId = taskData.id || `task-${crypto.randomUUID()}`;

  const newTask: Task = {
    id: taskId,
    createdAt: taskData.createdAt || now,
    updatedAt: now,
    title: taskData.title || 'Untitled Task',
    description: taskData.description || '',
    status: taskData.status || 'To Do',
    summary: taskData.summary || null,
    repositories: taskData.repositories || [],
    developers: taskData.developers || [],
    testers: taskData.testers || [],
    azureWorkItemId: taskData.azureWorkItemId || '',
    deploymentStatus: taskData.deploymentStatus || {},
    deploymentDates: taskData.deploymentDates || {},
    prLinks: taskData.prLinks || {},
    devStartDate: taskData.devStartDate || null,
    devEndDate: taskData.devEndDate || null,
    qaStartDate: taskData.qaStartDate || null,
    qaEndDate: taskData.qaEndDate || null,
    comments: taskData.comments || [],
    attachments: taskData.attachments || [],
    customFields: taskData.customFields || {},
  };
  
  data.companyData[activeCompanyId].tasks = [newTask, ...companyTasks];
  setAppData(data);
  return newTask;
}

export function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | undefined {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  const tasks = data.companyData[activeCompanyId]?.tasks || [];
  
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return undefined;
  }
  
  const updatedTask = { 
    ...tasks[taskIndex], 
    ...taskData,
    updatedAt: new Date().toISOString()
  };
  
  data.companyData[activeCompanyId].tasks[taskIndex] = updatedTask;
  setAppData(data);
  return updatedTask;
}

export function deleteTask(id: string): boolean {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  let tasks = data.companyData[activeCompanyId]?.tasks || [];
  
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return false;
  }
  tasks.splice(taskIndex, 1);
  data.companyData[activeCompanyId].tasks = tasks;
  setAppData(data);
  return true;
}

// =================================================================
// UNIFIED PERSON MANAGEMENT LOGIC
// =================================================================

type PersonType = 'developer' | 'tester';

function _getPeople(type: PersonType): Person[] {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    const companyData = data.companyData[activeCompanyId];
    if (!companyData) return [];

    return type === 'developer' ? (companyData.developers || []) : (companyData.testers || []);
}

function _addPerson(type: PersonType, personData: Partial<Omit<Person, 'id'>>): Person {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (!companyData) throw new Error(`Cannot add ${type}, no active company data found.`);
    if (!personData.name || personData.name.trim() === '') throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} name cannot be empty.`);
    
    const people = type === 'developer' ? (companyData.developers || []) : (companyData.testers || []);
    const trimmedName = personData.name.trim();

    if (people.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} with this name already exists.`);
    }

    if (/^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedName)) {
        throw new Error("Invalid name format. Cannot be the same as an ID.");
    }
    
    const newPerson: Person = {
        id: `${type}-${crypto.randomUUID()}`,
        name: trimmedName,
        email: personData.email || '',
        phone: personData.phone || ''
    };

    if (type === 'developer') {
        companyData.developers = [...people, newPerson];
    } else {
        companyData.testers = [...people, newPerson];
    }
    
    setAppData(data);
    return newPerson;
}

function _updatePerson(type: PersonType, id: string, personData: Partial<Omit<Person, 'id'>>): Person | undefined {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];
    if (!companyData) return undefined;

    const people = type === 'developer' ? (companyData.developers || []) : (companyData.testers || []);
    const personIndex = people.findIndex(p => p.id === id);
    if (personIndex === -1) return undefined;
    
    if (personData.name) {
        const trimmedName = personData.name.trim();
        if (people.some(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== id)) {
            throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} with this name already exists.`);
        }
        if (/^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedName)) {
            throw new Error("Invalid name format. Cannot be the same as an ID.");
        }
    }

    const updatedPerson = { ...people[personIndex], ...personData };

    if (type === 'developer') {
        companyData.developers[personIndex] = updatedPerson;
    } else {
        companyData.testers[personIndex] = updatedPerson;
    }

    setAppData(data);
    return updatedPerson;
}

function _deletePerson(type: PersonType, id: string): boolean {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];
    if (!companyData) return false;

    const people = type === 'developer' ? (companyData.developers || []) : (companyData.testers || []);
    const personIndex = people.findIndex(p => p.id === id);
    if (personIndex === -1) return false;
    
    const updatedPeople = people.filter(p => p.id !== id);

    if (type === 'developer') {
        companyData.developers = updatedPeople;
        companyData.tasks.forEach(task => {
            if (task.developers && task.developers.includes(id)) {
                task.developers = task.developers.filter(personId => personId !== id);
                task.updatedAt = new Date().toISOString();
            }
        });
    } else {
        companyData.testers = updatedPeople;
        companyData.tasks.forEach(task => {
            if (task.testers && task.testers.includes(id)) {
                task.testers = task.testers.filter(personId => personId !== id);
                task.updatedAt = new Date().toISOString();
            }
        });
    }

    setAppData(data);
    return true;
}


// Developer Functions
export function getDevelopers(): Person[] {
    return _getPeople('developer');
}
export function addDeveloper(personData: Partial<Omit<Person, 'id'>>): Person {
    return _addPerson('developer', personData);
}
export function updateDeveloper(id: string, personData: Partial<Omit<Person, 'id'>>): Person | undefined {
    return _updatePerson('developer', id, personData);
}
export function deleteDeveloper(id: string): boolean {
    return _deletePerson('developer', id);
}

// Tester Functions
export function getTesters(): Person[] {
    return _getPeople('tester');
}
export function addTester(personData: Partial<Omit<Person, 'id'>>): Person {
    return _addPerson('tester', personData);
}
export function updateTester(id: string, personData: Partial<Omit<Person, 'id'>>): Person | undefined {
    return _updatePerson('tester', id, personData);
}
export function deleteTester(id: string): boolean {
    return _deletePerson('tester', id);
}


// Comment Functions
export function addComment(taskId: string, comment: string): Task | undefined {
  const task = getTaskById(taskId);
  if (!task) return undefined;
  const newComments = [...(task.comments || []), comment];
  return updateTask(taskId, { comments: newComments });
}

export function updateComment(taskId: string, index: number, newComment: string): Task | undefined {
   const task = getTaskById(taskId);
   if (!task || !task.comments || index < 0 || index >= task.comments.length) return undefined;
   const newComments = [...task.comments];
   newComments[index] = newComment;
   return updateTask(taskId, { comments: newComments });
}

export function deleteComment(taskId: string, index: number): Task | undefined {
   const task = getTaskById(taskId);
   if (!task || !task.comments || index < 0 || index >= task.comments.length) return undefined;
   const newComments = task.comments.filter((_, i) => i !== index);
   return updateTask(taskId, { comments: newComments });
}
