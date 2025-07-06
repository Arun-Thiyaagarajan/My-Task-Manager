
import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log } from './types';
import cloneDeep from 'lodash/cloneDeep';

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
                trash: [],
                developers: [],
                testers: [],
                uiConfig: { 
                    fields: initialFields,
                    environments: [...ENVIRONMENTS],
                    repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
                    taskStatuses: [...TASK_STATUSES],
                    appName: 'My Task Manager',
                    appIcon: null,
                },
                logs: [],
            },
        },
    };
};

export const getAppData = (): MyTaskManagerData => {
    if (typeof window === 'undefined') {
        const defaultConfig: UiConfig = { 
            fields: INITIAL_UI_CONFIG,
            environments: [...ENVIRONMENTS],
            repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
            taskStatuses: [...TASK_STATUSES],
            appName: 'My Task Manager',
            appIcon: null,
        };
        return {
            companies: [{ id: 'company-placeholder', name: 'Default Company' }],
            activeCompanyId: 'company-placeholder',
            companyData: {
                'company-placeholder': {
                    tasks: [],
                    trash: [],
                    developers: [],
                    testers: [],
                    uiConfig: defaultConfig,
                    logs: [],
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
        // Migration for existing users: ensure trash and logs arrays exist
        Object.values(data.companyData).forEach(company => {
            if (!company.trash) company.trash = [];
            if (!company.logs) company.logs = [];
        });
        return data;
    } catch (e) {
        console.error(`Error with localStorage data, resetting:`, e);
        const initialData = getInitialData();
        window.localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
        return initialData;
    }
};

export const setAppData = (data: MyTaskManagerData) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
};

// Logging Functions
export const addLog = (logData: Omit<Log, 'id' | 'timestamp'>) => {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return;

    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        ...logData,
    };
    companyData.logs.unshift(newLog);

    // Optional: Trim logs to prevent excessive storage usage
    if (companyData.logs.length > 2000) { // Keep last 2000 logs
        companyData.logs = companyData.logs.slice(0, 2000);
    }
    
    setAppData(data);
};

export function getLogs(): Log[] {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    return companyData?.logs || [];
}

export function getLogsForTask(taskId: string): Log[] {
    const allLogs = getLogs();
    return allLogs.filter(log => log.taskId === taskId);
}

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
    const oldActiveCompanyId = data.activeCompanyId;
    data.activeCompanyId = newCompanyId;

    addLog({ message: `Created new company: "${name}".` });

    data.activeCompanyId = oldActiveCompanyId;
    setAppData(data);
    return newCompany;
}

export function updateCompany(id: string, name: string): Company | undefined {
    const data = getAppData();
    const companyIndex = data.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return undefined;
    
    const oldName = data.companies[companyIndex].name;
    data.companies[companyIndex].name = name;

    const currentActiveCompanyId = data.activeCompanyId;
    data.activeCompanyId = id; // Temporarily switch context to log to the right company
    addLog({ message: `Renamed company from "${oldName}" to "${name}".` });
    data.activeCompanyId = currentActiveCompanyId; // Switch back

    setAppData(data);
    return data.companies[companyIndex];
}

export function deleteCompany(id: string): boolean {
    const data = getAppData();
    if (data.companies.length <= 1) return false;

    const companyIndex = data.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return false;
    
    const companyName = data.companies[companyIndex].name;
    const currentActiveCompanyId = data.activeCompanyId;
    
    delete data.companyData[id];
    data.companies.splice(companyIndex, 1);

    if (data.activeCompanyId === id) {
        data.activeCompanyId = data.companies[0].id;
    }
    
    data.activeCompanyId = data.activeCompanyId; // Context for log
    addLog({ message: `Deleted company: "${companyName}".`});
    data.activeCompanyId = currentActiveCompanyId;

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

function _validateAndMigrateConfig(savedConfig: Partial<UiConfig> | undefined): UiConfig {
    const defaultConfig: UiConfig = {
        fields: INITIAL_UI_CONFIG,
        environments: [...ENVIRONMENTS],
        repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
        taskStatuses: [...TASK_STATUSES],
        appName: 'My Task Manager',
        appIcon: null,
    };

    if (!savedConfig || typeof savedConfig !== 'object') {
        return cloneDeep(defaultConfig);
    }

    const resultConfig = cloneDeep(defaultConfig);

    if (Array.isArray(savedConfig.environments)) resultConfig.environments = cloneDeep(savedConfig.environments);
    if (Array.isArray(savedConfig.repositoryConfigs)) resultConfig.repositoryConfigs = cloneDeep(savedConfig.repositoryConfigs);
    
    resultConfig.taskStatuses = [...TASK_STATUSES];
    
    resultConfig.appName = savedConfig.appName || defaultConfig.appName;
    resultConfig.appIcon = savedConfig.appIcon === undefined ? defaultConfig.appIcon : savedConfig.appIcon;
    
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
            const isSortable = ['select', 'multiselect', 'tags'].includes(field.type) && field.key !== 'status';
            if (isSortable && !field.sortDirection) {
                field.sortDirection = 'asc';
            }
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
            const isSortable = ['select', 'multiselect', 'tags'].includes(field.type) && field.key !== 'status';
            if (isSortable && !field.sortDirection) {
                field.sortDirection = 'asc';
            }
        });
        
        const newLog: Log = {
            id: `log-${crypto.randomUUID()}`,
            timestamp: new Date().toISOString(),
            message: "Application settings were updated."
        };
        data.companyData[activeCompanyId].logs.unshift(newLog);

        data.companyData[activeCompanyId].uiConfig = newConfig;
        setAppData(data);
        window.dispatchEvent(new Event('config-changed'));
    }
    return newConfig;
}

export function addEnvironment(name: string): boolean {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];
    if (!companyData) return false;

    const trimmedName = name.trim().toLowerCase();
    if (trimmedName === '') return false;

    const currentEnvs = companyData.uiConfig.environments.map(e => e.toLowerCase());
    if (currentEnvs.includes(trimmedName)) {
        return false;
    }
    
    const realName = name.trim();
    companyData.uiConfig.environments.push(realName);
    
    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        message: `Added new environment: "${realName}".`
    };
    companyData.logs.unshift(newLog);

    setAppData(data);
    window.dispatchEvent(new Event('config-changed'));
    return true;
}

export function updateEnvironmentName(oldName: string, newName: string): boolean {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (!companyData || !companyData.uiConfig.environments?.includes(oldName)) {
        return false;
    }

    const trimmedNewName = newName.trim();
    if (trimmedNewName === '' || companyData.uiConfig.environments.some(env => env.toLowerCase() === trimmedNewName.toLowerCase() && env.toLowerCase() !== oldName.toLowerCase())) {
        return false;
    }
    
    const { uiConfig, tasks, trash } = companyData;
    const envIndex = uiConfig.environments.indexOf(oldName);
    uiConfig.environments[envIndex] = trimmedNewName;
    
    const renameEnvInTask = (task: Task) => {
        let changed = false;
        if (task.deploymentStatus && oldName in task.deploymentStatus) {
            task.deploymentStatus[trimmedNewName] = task.deploymentStatus[oldName];
            delete task.deploymentStatus[oldName];
            changed = true;
        }
        if (task.deploymentDates && oldName in task.deploymentDates) {
            task.deploymentDates[trimmedNewName] = task.deploymentDates[oldName];
            delete task.deploymentDates[oldName];
            changed = true;
        }
        if (task.prLinks && oldName in task.prLinks) {
            task.prLinks[trimmedNewName] = task.prLinks[oldName];
            delete task.prLinks[oldName];
            changed = true;
        }
        if(changed) {
          task.updatedAt = new Date().toISOString();
        }
    };
    
    tasks.forEach(renameEnvInTask);
    trash.forEach(renameEnvInTask);

    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        message: `Renamed environment from "${oldName}" to "${trimmedNewName}".`
    };
    companyData.logs.unshift(newLog);

    data.companyData[activeCompanyId] = { ...companyData, uiConfig, tasks, trash };
    setAppData(data);
    window.dispatchEvent(new Event('config-changed'));
    return true;
}

export function deleteEnvironment(name: string): boolean {
    const protectedEnvs = ['dev', 'production'];
    if (protectedEnvs.includes(name.toLowerCase())) {
        return false;
    }

    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];

    if (!companyData || !companyData.uiConfig.environments?.includes(name)) {
        return false;
    }
    
    const { uiConfig, tasks, trash } = companyData;
    uiConfig.environments = uiConfig.environments.filter(env => env !== name);

    const deleteEnvFromTask = (task: Task) => {
        let changed = false;
        if (task.deploymentStatus && name in task.deploymentStatus) {
            delete task.deploymentStatus[name];
            changed = true;
        }
        if (task.deploymentDates && name in task.deploymentDates) {
            delete task.deploymentDates[name];
            changed = true;
        }
        if (task.prLinks && name in task.prLinks) {
            delete task.prLinks[name];
            changed = true;
        }
        if(changed) {
          task.updatedAt = new Date().toISOString();
        }
    };

    tasks.forEach(deleteEnvFromTask);
    trash.forEach(deleteEnvFromTask);

    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        message: `Deleted environment: "${name}".`
    };
    companyData.logs.unshift(newLog);

    data.companyData[activeCompanyId] = { ...companyData, uiConfig, tasks, trash };
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
  const allTasks = [...getTasks(), ...getBinnedTasks()];
  return allTasks.find(task => task.id === id);
}

export function addTask(taskData: Partial<Task>, isBinned: boolean = false): Task {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  const companyData = data.companyData[activeCompanyId];
  
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
  
  const logMessage = `Created new task: "${newTask.title}".`;
  
  if (isBinned) {
      newTask.deletedAt = taskData.deletedAt || now;
      companyData.trash = [newTask, ...(companyData.trash || [])];
      addLog({ message: `Created a binned task: "${newTask.title}".`, taskId: newTask.id });
  } else {
      companyData.tasks = [newTask, ...companyData.tasks];
      addLog({ message: logMessage, taskId: newTask.id });
  }

  setAppData(data);
  return newTask;
}

const generateTaskUpdateLogs = (
    oldTask: Task, 
    newTaskData: Partial<Task>, 
    uiConfig: UiConfig,
    developers: Person[], 
    testers: Person[]
): Omit<Log, 'id' | 'timestamp'>[] => {
    const logs: Omit<Log, 'id' | 'timestamp'>[] = [];
    const taskId = oldTask.id;
    const taskTitle = newTaskData.title || oldTask.title;
    const createLog = (message: string) => logs.push({ message, taskId });

    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
    const developersById = new Map(developers.map(p => [p.id, p.name]));
    const testersById = new Map(testers.map(p => [p.id, p.name]));

    if (newTaskData.title && newTaskData.title !== oldTask.title) {
        createLog(`Updated title from "${oldTask.title}" to "${newTaskData.title}".`);
    }
    if ('description' in newTaskData && newTaskData.description !== oldTask.description) {
        createLog(`Updated description for task "${taskTitle}".`);
    }
    if (newTaskData.status && newTaskData.status !== oldTask.status) {
        createLog(`Changed status for task "${taskTitle}" from "${oldTask.status}" to "${newTaskData.status}".`);
    }
    
    if ('deploymentStatus' in newTaskData || 'deploymentDates' in newTaskData) {
        const allEnvs = uiConfig.environments || [];
        allEnvs.forEach(env => {
            const oldSelected = oldTask.deploymentStatus?.[env] ?? false;
            const newSelected = 'deploymentStatus' in newTaskData ? (newTaskData.deploymentStatus?.[env] ?? false) : oldSelected;
            
            const oldDate = oldTask.deploymentDates?.[env];
            const newDate = 'deploymentDates' in newTaskData ? (newTaskData.deploymentDates?.[env] ?? null) : oldDate;

            const oldIsDeployed = oldSelected && (env === 'dev' || !!oldDate);
            const newIsDeployed = newSelected && (env === 'dev' || !!newDate);
            
            if (oldIsDeployed !== newIsDeployed) {
                const envName = env.charAt(0).toUpperCase() + env.slice(1);
                createLog(`Changed deployment for task "${taskTitle}" in "${envName}" to ${newIsDeployed ? 'Deployed' : 'Pending'}.`);
            }
        });
    }

    if(newTaskData.developers) {
        const oldDevs = new Set(oldTask.developers || []);
        const newDevs = new Set(newTaskData.developers || []);
        (newTaskData.developers || []).filter(id => !oldDevs.has(id)).forEach(id => createLog(`Assigned developer "${developersById.get(id) || 'Unknown'}" to task "${taskTitle}".`));
        (oldTask.developers || []).filter(id => !newDevs.has(id)).forEach(id => createLog(`Unassigned developer "${developersById.get(id) || 'Unknown'}" from task "${taskTitle}".`));
    }
    
    if(newTaskData.testers) {
        const oldTesters = new Set(oldTask.testers || []);
        const newTesters = new Set(newTaskData.testers || []);
        (newTaskData.testers || []).filter(id => !oldTesters.has(id)).forEach(id => createLog(`Assigned tester "${testersById.get(id) || 'Unknown'}" to task "${taskTitle}".`));
        (oldTask.testers || []).filter(id => !newTesters.has(id)).forEach(id => createLog(`Unassigned tester "${testersById.get(id) || 'Unknown'}" from task "${taskTitle}".`));
    }
    
    if (newTaskData.prLinks && JSON.stringify(newTaskData.prLinks) !== JSON.stringify(oldTask.prLinks)) {
        createLog(`Updated Pull Request links for task "${taskTitle}".`);
    }
    if (newTaskData.attachments && JSON.stringify(newTaskData.attachments) !== JSON.stringify(oldTask.attachments)) {
        createLog(`Updated attachments for task "${taskTitle}".`);
    }
    
    const dateFields: (keyof Task)[] = ['devStartDate', 'devEndDate', 'qaStartDate', 'qaEndDate'];
    dateFields.forEach(key => {
        if (key in newTaskData) {
            const oldDate = oldTask[key] ? new Date(oldTask[key] as string).toDateString() : null;
            const newDate = newTaskData[key] ? new Date(newTaskData[key] as string).toDateString() : null;
            if (oldDate !== newDate) {
                const label = fieldLabels.get(key) || key;
                createLog(`Updated ${label} for task "${taskTitle}" to ${newDate ? newDate : 'empty'}.`);
            }
        }
    });

    return logs;
}

export function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | undefined {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  const companyData = data.companyData[activeCompanyId];
  if (!companyData) return undefined;
  
  let oldTask: Task | undefined;
  let taskIndex: number = -1;
  let isBinned = false;

  taskIndex = companyData.tasks.findIndex(task => task.id === id);
  if (taskIndex !== -1) {
    oldTask = cloneDeep(companyData.tasks[taskIndex]);
  } else {
    taskIndex = companyData.trash.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      oldTask = cloneDeep(companyData.trash[taskIndex]);
      isBinned = true;
    }
  }

  if (!oldTask || taskIndex === -1) return undefined;
  
  const uiConfig = companyData.uiConfig;
  const logsToCreate = generateTaskUpdateLogs(oldTask, taskData, uiConfig, companyData.developers, companyData.testers);
  const now = new Date().toISOString();

  logsToCreate.forEach(log => {
      const newLog: Log = {
          id: `log-${crypto.randomUUID()}`,
          timestamp: now,
          ...log
      };
      companyData.logs.unshift(newLog);
  });
  if (companyData.logs.length > 2000) {
    companyData.logs = companyData.logs.slice(0, 2000);
  }

  const updatedTask = { ...oldTask, ...taskData, updatedAt: new Date().toISOString() };
  
  if (isBinned) {
    companyData.trash[taskIndex] = updatedTask;
  } else {
    companyData.tasks[taskIndex] = updatedTask;
  }

  setAppData(data);
  return updatedTask;
}

// Bin/Trash Functions
export function getBinnedTasks(): Task[] {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return [];
    // Auto-delete tasks older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTrash = (companyData.trash || []).filter(task =>
        task.deletedAt && new Date(task.deletedAt) > thirtyDaysAgo
    );
    if (recentTrash.length < (companyData.trash || []).length) {
        companyData.trash = recentTrash;
        setAppData(data);
    }
    return recentTrash.sort((a,b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
}

export function moveTaskToBin(id: string): boolean {
  const data = getAppData();
  const companyData = data.companyData[data.activeCompanyId];
  if (!companyData) return false;

  const taskIndex = companyData.tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) return false;
  
  const [taskToBin] = companyData.tasks.splice(taskIndex, 1);
  taskToBin.deletedAt = new Date().toISOString();
  companyData.trash.unshift(taskToBin);
  
  const newLog: Log = {
    id: `log-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    message: `Moved task "${taskToBin.title}" to the bin.`,
    taskId: id
  };
  companyData.logs.unshift(newLog);

  setAppData(data);
  return true;
}

export function moveMultipleTasksToBin(ids: string[]): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return false;
    
    const tasksToBin = companyData.tasks.filter(task => ids.includes(task.id));
    if (tasksToBin.length === 0) return false;

    const now = new Date().toISOString();
    tasksToBin.forEach(task => {
        task.deletedAt = now;
        const newLog: Log = {
            id: `log-${crypto.randomUUID()}`,
            timestamp: now,
            message: `Moved task "${task.title}" to the bin.`, 
            taskId: task.id
        };
        companyData.logs.unshift(newLog);
    });

    companyData.tasks = companyData.tasks.filter(task => !ids.includes(task.id));
    companyData.trash.unshift(...tasksToBin);

    if (companyData.logs.length > 2000) {
        companyData.logs = companyData.logs.slice(0, 2000);
    }
    
    setAppData(data);
    return true;
}

export function restoreTask(id: string): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return false;

    const taskIndex = companyData.trash.findIndex(task => task.id === id);
    if (taskIndex === -1) return false;

    const [taskToRestore] = companyData.trash.splice(taskIndex, 1);
    delete taskToRestore.deletedAt;
    companyData.tasks.unshift(taskToRestore);

    addLog({ message: `Restored task "${taskToRestore.title}" from the bin.`, taskId: id });
    setAppData(data);
    return true;
}

export function restoreMultipleTasks(ids: string[]): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return false;

    const tasksToRestore = companyData.trash.filter(task => ids.includes(task.id));
    if (tasksToRestore.length === 0) return false;

    const now = new Date().toISOString();
    tasksToRestore.forEach(task => {
        delete task.deletedAt;
        const newLog: Log = {
            id: `log-${crypto.randomUUID()}`,
            timestamp: now,
            message: `Restored task "${task.title}" from the bin.`,
            taskId: task.id
        };
        companyData.logs.unshift(newLog);
    });

    companyData.trash = companyData.trash.filter(task => !ids.includes(task.id));
    companyData.tasks.unshift(...tasksToRestore);
    
    if (companyData.logs.length > 2000) {
        companyData.logs = companyData.logs.slice(0, 2000);
    }

    setAppData(data);
    return true;
}

export function permanentlyDeleteTask(id: string): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return false;
    
    const taskToDelete = companyData.trash.find(task => task.id === id);
    if (!taskToDelete) return false;

    companyData.trash = companyData.trash.filter(task => task.id !== id);
    
    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        message: `Permanently deleted task "${taskToDelete.title}".`
    };
    companyData.logs.unshift(newLog);
    
    setAppData(data);
    return true;
}

export function permanentlyDeleteMultipleTasks(ids: string[]): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return false;
    
    const tasksToDelete = companyData.trash.filter(task => ids.includes(task.id));
    if (tasksToDelete.length === 0) return false;
    
    const now = new Date().toISOString();
    tasksToDelete.forEach(task => {
      const newLog: Log = {
          id: `log-${crypto.randomUUID()}`,
          timestamp: now,
          message: `Permanently deleted task "${task.title}".`
      };
      companyData.logs.unshift(newLog);
    });
    
    companyData.trash = companyData.trash.filter(task => !ids.includes(task.id));

    if (companyData.logs.length > 2000) {
        companyData.logs = companyData.logs.slice(0, 2000);
    }

    setAppData(data);
    return true;
}

export function emptyBin(): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || companyData.trash.length === 0) return false;
    
    const logMessage = `Emptied all ${companyData.trash.length} tasks from the bin.`;
    companyData.trash = [];

    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        message: logMessage
    };
    companyData.logs.unshift(newLog);

    setAppData(data);
    return true;
}

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
    
    addLog({ message: `Added new ${type}: "${newPerson.name}".` });
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

    const oldName = people[personIndex].name;
    
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
    
    if(updatedPerson.name !== oldName) {
        addLog({ message: `Renamed ${type} from "${oldName}" to "${updatedPerson.name}".` });
    } else {
        addLog({ message: `Updated details for ${type} "${updatedPerson.name}".` });
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
    
    const personName = people[personIndex].name;
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
    
    addLog({ message: `Deleted ${type}: "${personName}".` });
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
  addLog({ message: `Added a comment to task "${task.title}": "${comment.substring(0, 50)}..."`, taskId });
  return updateTask(taskId, { comments: newComments });
}

export function updateComment(taskId: string, index: number, newComment: string): Task | undefined {
   const task = getTaskById(taskId);
   if (!task || !task.comments || index < 0 || index >= task.comments.length) return undefined;
   const oldComment = task.comments[index];
   const newComments = [...task.comments];
   newComments[index] = newComment;
   addLog({ message: `Updated a comment on task "${task.title}".`, taskId });
   return updateTask(taskId, { comments: newComments });
}

export function deleteComment(taskId: string, index: number): Task | undefined {
   const task = getTaskById(taskId);
   if (!task || !task.comments || index < 0 || index >= task.comments.length) return undefined;
   const deletedComment = task.comments[index];
   const newComments = task.comments.filter((_, i) => i !== index);
   addLog({ message: `Deleted a comment from task "${task.title}": "${deletedComment.substring(0, 50)}..."`, taskId });
   return updateTask(taskId, { comments: newComments });
}
