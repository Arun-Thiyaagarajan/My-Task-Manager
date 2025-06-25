
import type { Task, Developer, Company, Attachment } from './types';

interface CompanyData {
    tasks: Task[];
    developers: Developer[];
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
                developers: ['Arun', 'Samantha', 'Rajesh'],
            },
        },
    };
};

const getAppData = (): MyTaskManagerData => {
    if (typeof window === 'undefined') {
        return {
            companies: [{ id: 'company-placeholder', name: 'Default Company' }],
            activeCompanyId: 'company-placeholder',
            companyData: {
                'company-placeholder': {
                    tasks: [],
                    developers: ['Arun', 'Samantha', 'Rajesh'],
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
        const data = JSON.parse(stored);
        if (!data.companies || !data.activeCompanyId || !data.companyData) {
            throw new Error("Invalid data structure");
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
    data.companyData[newCompanyId] = { tasks: [], developers: ['Arun', 'Samantha', 'Rajesh'] };
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
  const existingTaskIds = new Set(companyTasks.map(t => t.id));

  let taskId = taskData.id;

  if (!taskId || existingTaskIds.has(taskId)) {
    taskId = `task-${crypto.randomUUID()}`;
  }
  
  const now = new Date().toISOString();
  const newTask: Task = {
    id: taskId,
    createdAt: taskData.createdAt || now,
    updatedAt: now,
    title: taskData.title || 'Untitled Task',
    description: taskData.description || '',
    status: taskData.status || 'To Do',
    repositories: taskData.repositories || [],
    developers: taskData.developers || [],
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
