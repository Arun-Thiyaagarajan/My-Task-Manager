
import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS } from './constants';
import type { Task, Person, Company, Attachment, UiConfig } from './types';

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
    return {
        companies: [{ id: defaultCompanyId, name: 'Default Company' }],
        activeCompanyId: defaultCompanyId,
        companyData: {
            [defaultCompanyId]: {
                tasks: [],
                developers: [],
                testers: [],
                uiConfig: { 
                    fields: INITIAL_UI_CONFIG,
                    environments: [...ENVIRONMENTS],
                    coreEnvironments: [...ENVIRONMENTS],
                    repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
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
        if (!data.companies || !data.activeCompanyId || !data.companyData) {
            throw new Error("Invalid data structure");
        }

        // One-time cleanup of old default developers/testers.
        let dataWasModified = false;
        const defaultNamesToRemove = new Set(["Samantha", "Arun", "Rajesh", "Chloe"]);
        
        for (const companyId in data.companyData) {
            const company = data.companyData[companyId];

            if (company.developers && company.developers.length > 0) {
                const originalDevCount = company.developers.length;
                company.developers = company.developers.filter(dev => typeof dev === 'object' && dev.name && !defaultNamesToRemove.has(dev.name));
                if (company.developers.length !== originalDevCount) {
                    dataWasModified = true;
                }
            }

            if (company.testers && company.testers.length > 0) {
                const originalTesterCount = company.testers.length;
                company.testers = company.testers.filter(tester => typeof tester === 'object' && tester.name && !defaultNamesToRemove.has(tester.name));
                if (company.testers.length !== originalTesterCount) {
                    dataWasModified = true;
                }
            }
        }
        
        if (dataWasModified) {
            setAppData(data);
        }

        return data;
    } catch (e) {
        console.error(`Error parsing localStorage key "${DATA_KEY}":`, e);
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

// UI Config Functions
export function getUiConfig(): UiConfig {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    if (!activeCompanyId || !data.companyData[activeCompanyId]) {
        return { fields: INITIAL_UI_CONFIG, environments: [...ENVIRONMENTS], coreEnvironments: [...ENVIRONMENTS], repositoryConfigs: INITIAL_REPOSITORY_CONFIGS };
    }
    const companyConfig = data.companyData[activeCompanyId].uiConfig;

    let needsUpdate = false;
    if (!companyConfig || !Array.isArray(companyConfig.fields) || !companyConfig.environments) {
        const newConfig = { 
            fields: companyConfig?.fields || INITIAL_UI_CONFIG,
            environments: companyConfig?.environments || [...ENVIRONMENTS],
            coreEnvironments: companyConfig?.coreEnvironments || [...ENVIRONMENTS],
            repositoryConfigs: companyConfig?.repositoryConfigs || INITIAL_REPOSITORY_CONFIGS,
        };
        data.companyData[activeCompanyId].uiConfig = newConfig;
        setAppData(data);
        return newConfig;
    }
    
    if (!companyConfig.coreEnvironments) {
        companyConfig.coreEnvironments = companyConfig.environments.filter(e => (ENVIRONMENTS as readonly string[]).includes(e));
        needsUpdate = true;
    }

    if (!companyConfig.repositoryConfigs) {
        companyConfig.repositoryConfigs = INITIAL_REPOSITORY_CONFIGS;
        needsUpdate = true;
    }

    const initialFieldCount = companyConfig.fields.length;
    companyConfig.fields = companyConfig.fields.filter(f => f.key !== 'deploymentDates');
    if (companyConfig.fields.length !== initialFieldCount) {
        needsUpdate = true;
    }

    const coreFieldsMap = new Map(INITIAL_UI_CONFIG.map(f => [f.key, f]));
    
    companyConfig.fields.forEach(field => {
        if (!field.isCustom) {
            const coreField = coreFieldsMap.get(field.key);
            if (coreField && (field.isRequired !== coreField.isRequired || field.isCustom !== coreField.isCustom || field.type !== coreField.type)) {
                field.isRequired = coreField.isRequired;
                field.isCustom = coreField.isCustom;
                field.type = coreField.type;
                needsUpdate = true;
            }
        }
    });

    const presentCoreFieldKeys = new Set(companyConfig.fields.filter(f => !f.isCustom).map(f => f.key));
    for (const coreField of INITIAL_UI_CONFIG) {
        if (!presentCoreFieldKeys.has(coreField.key)) {
            companyConfig.fields.push(coreField);
            needsUpdate = true;
        }
    }
    
    const developersField = companyConfig.fields.find(f => f.key === 'developers');
    if (developersField && developersField.type !== 'tags') {
        developersField.type = 'tags';
        needsUpdate = true;
    }
    const testersField = companyConfig.fields.find(f => f.key === 'testers');
    if (testersField && testersField.type !== 'tags') {
        testersField.type = 'tags';
        needsUpdate = true;
    }

    if (needsUpdate) {
        companyConfig.fields.sort((a, b) => a.order - b.order);
        setAppData(data);
    }

    return companyConfig;
}

export function updateUiConfig(newConfig: UiConfig): UiConfig {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    if (data.companyData[activeCompanyId]) {
        newConfig.fields.sort((a, b) => a.order - b.order);
        for (let i = 0; i < newConfig.fields.length; i++) {
            newConfig.fields[i].order = i;
        }
        data.companyData[activeCompanyId].uiConfig = newConfig;
        setAppData(data);
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

    setAppData(data);
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

function getPeople(type: 'developers' | 'testers'): Person[] {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    if (!activeCompanyId || !data.companyData[activeCompanyId]) {
        return [];
    }
    return data.companyData[activeCompanyId][type] || [];
}

function addPerson(type: 'developers' | 'testers', personData: Partial<Omit<Person, 'id'>>): Person {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (!companyData) throw new Error("Cannot add person, no active company data found.");
    if (!personData.name || personData.name.trim() === '') throw new Error("Person name cannot be empty.");
    
    const people = companyData[type] || [];
    const trimmedName = personData.name.trim();

    // Stricter Safeguard: Reject any name that looks like an ID. No exceptions.
    const isIdFormat = /^(developer|tester)-[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/i.test(trimmedName);
    if (isIdFormat) {
        console.error(`CRITICAL: Attempted to create a person with an ID as a name: "${trimmedName}". This is a data corruption bug.`);
        throw new Error("A system error occurred. Could not create person with an invalid name format.");
    }

    // Check for existing person with the same name.
    const existingPersonByName = people.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingPersonByName) {
        return existingPersonByName;
    }

    // Create the new person.
    const newPerson: Person = {
        id: `${type.slice(0, -1)}-${crypto.randomUUID()}`,
        name: trimmedName,
        email: personData.email || '',
        phone: personData.phone || ''
    };
    
    companyData[type] = [...people, newPerson];
    setAppData(data);
    
    return newPerson;
}

function updatePerson(type: 'developers' | 'testers', id: string, personData: Partial<Omit<Person, 'id'>>): Person | undefined {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const people = data.companyData[activeCompanyId]?.[type] || [];
    
    if (personData.name) {
        const trimmedName = personData.name.trim();
        const isIdFormat = /^(developer|tester)-[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/i.test(trimmedName);
        if (isIdFormat) {
             console.error(`CRITICAL: Attempted to update a person's name to an ID format: "${trimmedName}".`);
             throw new Error("A system error occurred. The person's name could not be updated to an invalid format.");
        }

        const existingPerson = people.find(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== id);
        if (existingPerson) {
            throw new Error(`${type === 'developers' ? 'Developer' : 'Tester'} with this name already exists.`);
        }
    }
    
    const personIndex = people.findIndex(p => p.id === id);
    if (personIndex === -1) return undefined;

    const updatedPerson = { ...people[personIndex], ...personData };
    data.companyData[activeCompanyId][type][personIndex] = updatedPerson;
    setAppData(data);
    return updatedPerson;
}

function deletePerson(type: 'developers' | 'testers', id: string): boolean {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (!companyData) return false;

    const people = companyData[type];
    const personIndex = people.findIndex(p => p.id === id);

    if (personIndex === -1) {
        return false;
    }

    companyData[type] = people.filter(p => p.id !== id);

    companyData.tasks.forEach(task => {
        const assignments = task[type];
        if (assignments && assignments.includes(id)) {
            task[type] = assignments.filter(personId => personId !== id);
            task.updatedAt = new Date().toISOString();
        }
    });

    setAppData(data);
    return true;
}

// Developer Functions
export const getDevelopers = () => getPeople('developers');
export const addDeveloper = (data: Partial<Omit<Person, 'id'>>) => addPerson('developers', data);
export const updateDeveloper = (id: string, data: Partial<Omit<Person, 'id'>>) => updatePerson('developers', id, data);
export const deleteDeveloper = (id: string) => deletePerson('developers', id);

// Tester Functions
export const getTesters = () => getPeople('testers');
export const addTester = (data: Partial<Omit<Person, 'id'>>) => addPerson('testers', data);
export const updateTester = (id: string, data: Partial<Omit<Person, 'id'>>) => updatePerson('testers', id, data);
export const deleteTester = (id: string) => deletePerson('testers', id);

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
