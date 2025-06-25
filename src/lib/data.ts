
import type { Task, Developer, Company, AdminConfig, FormField } from './types';
import { DEFAULT_ADMIN_CONFIG, MASTER_FORM_FIELDS } from './form-config';
import { cloneDeep } from 'lodash';

interface CompanyData {
    tasks: Task[];
    developers: Developer[];
    adminConfig: AdminConfig;
    fields: Record<string, FormField>;
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
    const defaultCompanyId = `company-${Date.now()}`;
    return {
        companies: [{ id: defaultCompanyId, name: 'Default Company' }],
        activeCompanyId: defaultCompanyId,
        companyData: {
            [defaultCompanyId]: {
                tasks: [],
                developers: ['Arun'],
                adminConfig: cloneDeep(DEFAULT_ADMIN_CONFIG),
                fields: cloneDeep(MASTER_FORM_FIELDS),
            },
        },
    };
};

const getAppData = (): MyTaskManagerData => {
    if (typeof window === 'undefined') {
        return getInitialData(); // Return initial data for SSR to avoid undefined errors
    }
    const stored = window.localStorage.getItem(DATA_KEY);
    if (!stored) {
        const initialData = getInitialData();
        window.localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
        return initialData;
    }
    try {
        const data = JSON.parse(stored);
        if (!data.companies || !data.activeCompanyId || !data.companyData) {
            throw new Error("Invalid data structure");
        }
        // Migration for older data structures
        for (const companyId in data.companyData) {
            if (!data.companyData[companyId].fields) {
                 data.companyData[companyId].fields = cloneDeep(MASTER_FORM_FIELDS);
            }
            if (!data.companyData[companyId].adminConfig) {
                data.companyData[companyId].adminConfig = cloneDeep(DEFAULT_ADMIN_CONFIG);
            }
             const config = data.companyData[companyId].adminConfig;
            if (config && !config.groupOrder) {
                config.groupOrder = cloneDeep(DEFAULT_ADMIN_CONFIG.groupOrder);
            }
            if (config && config.formLayout) {
                Object.keys(data.companyData[companyId].fields).forEach(fieldId => {
                    if(!config.fieldConfig[fieldId]){
                        config.fieldConfig[fieldId] = { visible: false, required: false };
                    }
                    config.fieldConfig[fieldId].visible = config.formLayout.includes(fieldId);
                });
            }
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
    const newCompanyId = `company-${Date.now()}`;
    const newCompany: Company = { id: newCompanyId, name };
    
    data.companies.push(newCompany);
    data.companyData[newCompanyId] = { tasks: [], developers: ['Arun'], adminConfig: cloneDeep(DEFAULT_ADMIN_CONFIG), fields: cloneDeep(MASTER_FORM_FIELDS) };
    data.activeCompanyId = newCompanyId; // Switch to the new company

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
    if (data.companies.length <= 1) return false; // Cannot delete the last company

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

// Admin Config & Field Functions
export function getAdminConfig(): AdminConfig {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    return data.companyData[activeCompanyId]?.adminConfig || cloneDeep(DEFAULT_ADMIN_CONFIG);
}

export function updateAdminConfig(newConfig: AdminConfig) {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    if (activeCompanyId && data.companyData[activeCompanyId]) {
        Object.keys(data.companyData[activeCompanyId].fields).forEach(fieldId => {
            if(!newConfig.fieldConfig[fieldId]) newConfig.fieldConfig[fieldId] = { visible: false, required: false };
            newConfig.fieldConfig[fieldId].visible = newConfig.formLayout.includes(fieldId);
        });
        data.companyData[activeCompanyId].adminConfig = newConfig;
        setAppData(data);
    }
}

export function getFields(): Record<string, FormField> {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    return data.companyData[activeCompanyId]?.fields || {};
}

export function saveField(field: FormField, required: boolean) {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    if (activeCompanyId && data.companyData[activeCompanyId]) {
        const companyData = data.companyData[activeCompanyId];
        companyData.fields[field.id] = field;

        if (!companyData.adminConfig.fieldConfig[field.id]) {
            companyData.adminConfig.fieldConfig[field.id] = { visible: false, required: false };
        }
        companyData.adminConfig.fieldConfig[field.id].required = required;
        
        setAppData(data);
    }
}

export function deleteField(fieldId: string) {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (companyData?.fields[fieldId]?.isCustom) {
        delete companyData.fields[fieldId];
        
        companyData.adminConfig.formLayout = companyData.adminConfig.formLayout.filter(id => id !== fieldId);
        delete companyData.adminConfig.fieldConfig[fieldId];

        companyData.tasks.forEach(task => {
            if (fieldId in task) {
                delete task[fieldId];
            }
        });
        
        setAppData(data);
    }
}

export function addFieldOption(fieldId: string, option: string): boolean {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (companyData && companyData.fields[fieldId]) {
        const field = companyData.fields[fieldId];
        if (field.type === 'tags' || field.type === 'multiselect' || field.type === 'select') {
             if (!field.options) {
                field.options = [];
            }
            if (!field.options.includes(option)) {
                field.options.push(option);
                setAppData(data);
                return true;
            }
        }
    }
    return false;
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

export function addTask(taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  const companyTasks = data.companyData[activeCompanyId]?.tasks || [];

  const now = new Date().toISOString();
  const newTask: Task = {
    id: `task-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    title: taskData.title || 'Untitled Task',
    description: taskData.description || '',
    status: taskData.status || 'To Do',
    qaIssueIds: '', // Default to empty string
    ...taskData
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


// Developer Functions
export function getDevelopers(): Developer[] {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    if (!activeCompanyId || !data.companyData[activeCompanyId]) {
      return [];
    }
    return data.companyData[activeCompanyId].developers;
}

export function addDeveloper(name: string): Developer {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const developers = data.companyData[activeCompanyId]?.developers || [];
    
    const newDeveloper: Developer = name;
    if (!developers.includes(newDeveloper)) {
        data.companyData[activeCompanyId].developers = [...developers, newDeveloper];
        setAppData(data);
    }
    return newDeveloper;
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
