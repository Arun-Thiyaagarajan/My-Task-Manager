

import { INITIAL_UI_CONFIG, ENVIRONMENTS, INITIAL_REPOSITORY_CONFIGS, TASK_STATUSES } from './constants';
import type { Task, Person, Company, Attachment, UiConfig, FieldConfig, MyTaskManagerData, CompanyData, Log, Comment, GeneralReminder, BackupFrequency, Note, NoteLayout } from './types';
import cloneDeep from 'lodash/cloneDeep';
import { format, isToday, isYesterday } from 'date-fns';

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
                },
                logs: [],
                generalReminders: [],
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
            remindersEnabled: true,
            tutorialEnabled: true,
            timeFormat: '12h',
            autoBackupFrequency: 'weekly',
            autoBackupTime: 6,
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
                    notes: [],
                    uiConfig: defaultConfig,
                    logs: [],
                    generalReminders: [],
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
            if (!company.generalReminders) company.generalReminders = [];
            if (!company.notes) company.notes = [];
            company.developers.forEach(p => { if (!p.additionalFields) p.additionalFields = []; });
            company.testers.forEach(p => { if (!p.additionalFields) p.additionalFields = []; });
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
    window.dispatchEvent(new StorageEvent('storage', { key: DATA_KEY }));
};

// Internal logging helper that modifies the data object without saving it.
function _addLog(companyData: CompanyData, logData: Omit<Log, 'id' | 'timestamp'>) {
    if (!companyData) return;
    const newLog: Log = {
        id: `log-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        ...logData,
    };

    if (!companyData.logs) {
        companyData.logs = [];
    }
    
    companyData.logs.unshift(newLog);

    // Optional: Trim logs to prevent excessive storage usage
    if (companyData.logs.length > 2000) { // Keep last 2000 logs
        companyData.logs = companyData.logs.slice(0, 2000);
    }
}


// Logging Functions
export const addLog = (logData: Omit<Log, 'id' | 'timestamp'>) => {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return;
    _addLog(companyData, logData);
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

    const activeCompanyData = data.companyData[data.activeCompanyId];
    if (activeCompanyData) {
        _addLog(activeCompanyData, { message: `Added new company: "${name}".` });
    }
    
    setAppData(data);
    return newCompany;
}

export function updateCompany(id: string, name: string): Company | undefined {
    const data = getAppData();
    const companyIndex = data.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return undefined;
    
    const oldName = data.companies[companyIndex].name;
    data.companies[companyIndex].name = name;
    
    const activeCompanyData = data.companyData[data.activeCompanyId];
    if (activeCompanyData) {
        _addLog(activeCompanyData, { message: `Renamed company from "${oldName}" to "${name}".` });
    }

    setAppData(data);
    return data.companies[companyIndex];
}

export function deleteCompany(id: string): boolean {
    const data = getAppData();
    if (data.companies.length <= 1) return false;

    const companyIndex = data.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return false;
    
    const companyName = data.companies[companyIndex].name;
    
    delete data.companyData[id];
    data.companies.splice(companyIndex, 1);

    if (data.activeCompanyId === id) {
        data.activeCompanyId = data.companies[0].id;
    }
    
    const activeCompanyData = data.companyData[data.activeCompanyId];
    if (activeCompanyData) {
        _addLog(activeCompanyData, { message: `Deleted company: "${companyName}".`});
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

function _validateAndMigrateConfig(savedConfig: Partial<UiConfig> | undefined): UiConfig {
    const defaultConfig: UiConfig = {
        fields: INITIAL_UI_CONFIG,
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
    resultConfig.remindersEnabled = savedConfig.remindersEnabled ?? defaultConfig.remindersEnabled;
    resultConfig.tutorialEnabled = savedConfig.tutorialEnabled ?? defaultConfig.tutorialEnabled;
    resultConfig.timeFormat = savedConfig.timeFormat || defaultConfig.timeFormat;
    
    if (typeof (savedConfig as any).autoBackupEnabled === 'boolean') {
        resultConfig.autoBackupFrequency = (savedConfig as any).autoBackupEnabled ? 'weekly' : 'off';
    } else {
        resultConfig.autoBackupFrequency = savedConfig.autoBackupFrequency || defaultConfig.autoBackupFrequency;
    }
    resultConfig.autoBackupTime = savedConfig.autoBackupTime ?? defaultConfig.autoBackupTime;
    
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
                field.sortDirection = 'manual';
            }
        });

    return resultConfig;
}

const generateUiConfigUpdateLogs = (oldConfig: UiConfig, newConfig: UiConfig): string | null => {
    const logDetails: string[] = [];
    const createDetail = (message: string) => logDetails.push(message);

    // Branding changes
    if (oldConfig.appName !== newConfig.appName) {
        createDetail(`Updated app name from "${oldConfig.appName || 'My Task Manager'}" to "${newConfig.appName || 'My Task Manager'}".`);
    }
    if (oldConfig.appIcon !== newConfig.appIcon) {
        if (oldConfig.appIcon && !newConfig.appIcon) {
            createDetail('Removed the app icon.');
        } else if (!oldConfig.appIcon && newConfig.appIcon) {
            createDetail('Set a new app icon.');
        } else {
            createDetail('Updated the app icon.');
        }
    }
    
    if (oldConfig.remindersEnabled !== newConfig.remindersEnabled) {
        createDetail(`${newConfig.remindersEnabled ? 'Enabled' : 'Disabled'} the Task Reminders feature.`);
    }

    if (oldConfig.tutorialEnabled !== newConfig.tutorialEnabled) {
        createDetail(`${newConfig.tutorialEnabled ? 'Enabled' : 'Disabled'} the Tutorial feature.`);
    }

    if (oldConfig.autoBackupFrequency !== newConfig.autoBackupFrequency) {
        const frequency = newConfig.autoBackupFrequency === 'off' ? 'Off' : (newConfig.autoBackupFrequency?.charAt(0).toUpperCase() + newConfig.autoBackupFrequency?.slice(1));
        createDetail(`Set automatic backup frequency to **${frequency}**.`);
    }

    if (oldConfig.autoBackupTime !== newConfig.autoBackupTime) {
        const formatTime = (hour: number) => format(new Date(2000, 0, 1, hour), 'h a');
        const oldTime = oldConfig.autoBackupTime ? formatTime(oldConfig.autoBackupTime) : '6 AM';
        const newTime = newConfig.autoBackupTime ? formatTime(newConfig.autoBackupTime) : '6 AM';
        createDetail(`Set automatic backup time to **${newTime}**.`);
    }

    if (oldConfig.timeFormat !== newConfig.timeFormat) {
        createDetail(`Changed time format to ${newConfig.timeFormat === '24h' ? '24-hour' : '12-hour'}.`);
    }

    // Repository configuration changes
    if (JSON.stringify(oldConfig.repositoryConfigs) !== JSON.stringify(newConfig.repositoryConfigs)) {
        const oldRepos = new Map((oldConfig.repositoryConfigs || []).map(r => [r.id, r]));
        const newRepos = new Map((newConfig.repositoryConfigs || []).map(r => [r.id, r]));
        const repoLogDetails: string[] = [];

        newRepos.forEach((newRepo, id) => {
            const oldRepo = oldRepos.get(id);
            if (!oldRepo) {
                repoLogDetails.push(`- Added repository: "${newRepo.name}"`);
            } else if (oldRepo.name !== newRepo.name || oldRepo.baseUrl !== newRepo.baseUrl) {
                repoLogDetails.push(`- Updated repository "${oldRepo.name}":`);
                if (oldRepo.name !== newRepo.name) {
                    repoLogDetails.push(`  - Renamed to "${newRepo.name}"`);
                }
                if (oldRepo.baseUrl !== newRepo.baseUrl) {
                    repoLogDetails.push(`  - Changed URL to "${newRepo.baseUrl}"`);
                }
            }
        });
        oldRepos.forEach((oldRepo, id) => {
            if (!newRepos.has(id)) {
                repoLogDetails.push(`- Removed repository: "${oldRepo.name}"`);
            }
        });

        if (repoLogDetails.length > 0) {
            createDetail(`Updated repository configurations:\n${repoLogDetails.join('\n')}`);
        }
    }

    // Field changes
    const oldFieldsMap = new Map(oldConfig.fields.map(f => [f.id, f]));
    const newFieldsMap = new Map(newConfig.fields.map(f => [f.id, f]));

    // Check for added/deleted/updated fields
    const allFieldIds = new Set([...oldFieldsMap.keys(), ...newFieldsMap.keys()]);
    allFieldIds.forEach(id => {
        const oldField = oldFieldsMap.get(id);
        const newField = newFieldsMap.get(id);
        
        // Skip repository field as its config changes are logged separately
        if (newField?.key === 'repositories' || oldField?.key === 'repositories') return;

        if (newField && !oldField) {
            createDetail(`Added new field "${newField.label}" to the "${newField.group}" group.`);
            return;
        }

        if (!newField && oldField && oldField.isCustom) {
            createDetail(`Deleted custom field "${oldField.label}" from the "${oldField.group}" group.`);
            return;
        }

        if (newField && oldField) {
            const fieldUpdateDetails: string[] = [];
            
            if (oldField.label !== newField.label) { fieldUpdateDetails.push(`- Renamed from "${oldField.label}" to "${newField.label}".`); }
            if (oldField.group !== newField.group) { fieldUpdateDetails.push(`- Moved from group "${oldField.group}" to "${newField.group}".`); }
            if (oldField.isActive !== newField.isActive) { fieldUpdateDetails.push(`- Set as ${newField.isActive ? 'Active' : 'Inactive'}.`); }
            if (oldField.isRequired !== newField.isRequired) { fieldUpdateDetails.push(`- Set as ${newField.isRequired ? 'Required' : 'Not Required'}.`); }
            if (oldField.baseUrl !== newField.baseUrl) { fieldUpdateDetails.push(`- Changed Base URL from "${oldField.baseUrl || 'none'}" to "${newField.baseUrl || 'none'}".`); }
            if (oldField.sortDirection !== newField.sortDirection) { fieldUpdateDetails.push(`- Changed sort order to "${newField.sortDirection}".`); }
            
            const oldOptionsString = JSON.stringify((oldField.options || []).map(o => ({ value: o.value, label: o.label })).sort((a,b) => a.value.localeCompare(b.value)));
            const newOptionsString = JSON.stringify((newField.options || []).map(o => ({ value: o.value, label: o.label })).sort((a,b) => a.value.localeCompare(b.value)));

            if (oldOptionsString !== newOptionsString) {
                const oldOptions = new Map((oldField.options || []).map(o => [o.value, o.label]));
                const newOptions = new Map((newField.options || []).map(o => [o.value, o.label]));
                
                const optionChanges: string[] = [];
                newOptions.forEach((label, value) => {
                    if (!oldOptions.has(value)) {
                        optionChanges.push(`  - Added option: "${label}"`);
                    } else if (oldOptions.get(value) !== label) {
                        optionChanges.push(`  - Renamed option from "${oldOptions.get(value)}" to "${label}"`);
                    }
                });
                oldOptions.forEach((label, value) => {
                    if (!newOptions.has(value)) {
                        optionChanges.push(`  - Removed option: "${label}"`);
                    }
                });

                if (optionChanges.length > 0) {
                    fieldUpdateDetails.push('- Updated selection options:');
                    fieldUpdateDetails.push(...optionChanges);
                }
            }

            if (fieldUpdateDetails.length > 0) {
                const logMessage = `Updated settings for field "${oldField.label}":\n${fieldUpdateDetails.join('\n')}`;
                createDetail(logMessage);
            }
        }
    });
    
    // Check for field reordering as a fallback log
    const oldActiveOrder = oldConfig.fields.filter(f => f.isActive).map(f => f.id).join(',');
    const newActiveOrder = newConfig.fields.filter(f => f.isActive).map(f => f.id).join(',');
    if (oldActiveOrder !== newActiveOrder && logDetails.length === 0) {
        createDetail('Reordered active fields.');
    }
    
    if (logDetails.length === 0) return null;
    if (logDetails.length === 1) return logDetails[0];

    return `Updated application settings with multiple changes:\n\n${logDetails.join('\n\n')}`;
};

// UI Config Functions
export function getUiConfig(): UiConfig {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    const companyData = data.companyData[activeCompanyId];

    // On server, companyData can be undefined.
    if (!companyData) {
        return _validateAndMigrateConfig(undefined);
    }

    const validatedConfig = _validateAndMigrateConfig(companyData.uiConfig);

    // This is a silent migration. If the validated config is different,
    // it means the saved config was outdated or invalid. We save the
    // corrected version back to localStorage.
    if (JSON.stringify(validatedConfig) !== JSON.stringify(companyData.uiConfig)) {
        companyData.uiConfig = validatedConfig;
        setAppData(data);
    }
    
    return validatedConfig;
}

export function updateUiConfig(newConfig: UiConfig): UiConfig {
    const data = getAppData();
    const activeCompanyId = getActiveCompanyId();
    const companyData = data.companyData[activeCompanyId];

    if (!companyData) {
        return newConfig;
    }
    
    const oldConfig = companyData.uiConfig;

    // Sort fields by order to ensure consistency
    newConfig.fields.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    newConfig.fields.forEach((field, index) => {
        field.order = index;
        const isSortable = ['select', 'multiselect', 'tags'].includes(field.type) && field.key !== 'status';
        if (isSortable && !field.sortDirection) {
            field.sortDirection = 'manual';
        }
    });
    
    // --- Repository Rename Logic ---
    const oldRepoNameToId = new Map((oldConfig.repositoryConfigs || []).map(r => [r.name, r.id]));
    const newRepoIdToName = new Map((newConfig.repositoryConfigs || []).map(r => [r.id, r.name]));

    const tasksToUpdate = [
        ...companyData.tasks,
        ...(companyData.trash || []),
    ];

    tasksToUpdate.forEach(task => {
        let wasUpdated = false;

        // Update task.repositories with new names
        if (task.repositories && task.repositories.length > 0) {
            const updatedRepos = task.repositories
                .map(oldName => {
                    const repoId = oldRepoNameToId.get(oldName);
                    return repoId ? newRepoIdToName.get(repoId) : oldName;
                })
                .filter((r): r is string => !!r); // Filter out deleted repos

            if (JSON.stringify(task.repositories.sort()) !== JSON.stringify(updatedRepos.sort())) {
                task.repositories = updatedRepos;
                wasUpdated = true;
            }
        }

        // Update task.prLinks keys with new names
        if (task.prLinks) {
            const newPrLinks: Task['prLinks'] = {};
            let prLinksUpdated = false;
            
            for (const env in task.prLinks) {
                newPrLinks[env] = {};
                const repoLinks = task.prLinks[env];
                if (repoLinks) {
                    for (const oldName in repoLinks) {
                        const repoId = oldRepoNameToId.get(oldName);
                        const newName = repoId ? newRepoIdToName.get(repoId) : undefined;
                        
                        if (newName) { // Only add if it still exists
                            newPrLinks[env]![newName] = repoLinks[oldName];
                        }

                        if (newName !== oldName) {
                            prLinksUpdated = true;
                        }
                    }
                }
            }

            if (prLinksUpdated) {
                task.prLinks = newPrLinks;
                wasUpdated = true;
            }
        }
        
        if (wasUpdated) {
            task.updatedAt = new Date().toISOString();
        }
    });

    const logMessage = generateUiConfigUpdateLogs(oldConfig, newConfig);
    if (logMessage) {
        _addLog(companyData, { message: logMessage });
    }
    
    // Finally, update the config and save everything
    companyData.uiConfig = newConfig;
    setAppData(data);
    window.dispatchEvent(new Event('company-changed'));
    
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
    
    _addLog(companyData, { message: `Added new environment: "${realName}".` });

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
    (trash || []).forEach(renameEnvInTask);

    _addLog(companyData, { message: `Renamed environment from "${oldName}" to "${trimmedNewName}".` });

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
    (trash || []).forEach(deleteEnvFromTask);

    _addLog(companyData, { message: `Deleted environment: "${name}".` });

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
    isFavorite: taskData.isFavorite || false,
    reminder: taskData.reminder || null,
    reminderExpiresAt: taskData.reminderExpiresAt || null,
    
    repositories: taskData.repositories || [],
    azureWorkItemId: taskData.azureWorkItemId || '',
    tags: taskData.tags || [],
    prLinks: taskData.prLinks || {},
    deploymentStatus: taskData.deploymentStatus || {},
    deploymentDates: taskData.deploymentDates || {},
    developers: taskData.developers || [],
    testers: taskData.testers || [],
    comments: taskData.comments || [],
    attachments: taskData.attachments || [],
    
    devStartDate: taskData.devStartDate || null,
    devEndDate: taskData.devEndDate || null,
    qaStartDate: taskData.qaStartDate || null,
    qaEndDate: taskData.qaEndDate || null,

    customFields: taskData.customFields || {},
  };
  
  if (isBinned) {
      newTask.deletedAt = taskData.deletedAt || now;
      companyData.trash = [newTask, ...(companyData.trash || [])];
      _addLog(companyData, { message: `Added new binned task: "${newTask.title}".`, taskId: newTask.id });
  } else {
      companyData.tasks = [newTask, ...companyData.tasks];
      _addLog(companyData, { message: `Created new task: "${newTask.title}".`, taskId: newTask.id });
  }

  setAppData(data);
  return newTask;
}

export function addTagsToMultipleTasks(taskIds: string[], tagsToAdd: string[]): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || tagsToAdd.length === 0) return false;

    const tasksToUpdate = companyData.tasks.filter(task => taskIds.includes(task.id));
    if (tasksToUpdate.length === 0) return false;

    tasksToUpdate.forEach(task => {
        const existingTags = new Set(task.tags || []);
        tagsToAdd.forEach(tag => existingTags.add(tag));
        task.tags = Array.from(existingTags).sort();
        task.updatedAt = new Date().toISOString();
    });
    
    _addLog(companyData, { message: `Added tags [${tagsToAdd.join(', ')}] to ${tasksToUpdate.length} task(s).` });
    setAppData(data);
    return true;
}

const generateTaskUpdateLogs = (
    oldTask: Task, 
    newTaskData: Partial<Task>, 
    uiConfig: UiConfig,
    developers: Person[], 
    testers: Person[]
): string | null => {
    const changes: string[] = [];
    const taskTitle = newTaskData.title || oldTask.title;
    
    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
    const developersById = new Map(developers.map(p => [p.id, p.name]));
    const testersById = new Map(testers.map(p => [p.id, p.name]));
    const timeFormatString = uiConfig.timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';

    const formatValue = (value: any, formatter?: (v: any) => string) => {
        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || value === '') return '*empty*';
        const formattedValue = formatter ? formatter(value) : String(value);
        return `"${formattedValue}"`;
    };

    // This handles most simple fields and relationships.
    // Complex objects like deploymentStatus and prLinks are handled separately.
    const fieldsToLog = uiConfig.fields.filter(f => f.isActive && !['deploymentStatus', 'deploymentDates', 'prLinks', 'customFields'].includes(f.key));
    fieldsToLog.forEach(field => {
        const key = field.key as keyof Task;
        if (!(key in newTaskData)) return;

        let oldValue = oldTask[key];
        let newValue = newTaskData[key];

        if (key === 'repositories') {
            oldValue = Array.isArray(oldValue) ? oldValue : (oldValue ? [oldValue] : []);
            newValue = Array.isArray(newValue) ? newValue : (newValue ? [newValue] : []);
        }

        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
        
        let logEntry: string | null = null;
        const label = field.label;
        
        switch (key) {
            case 'title':
            case 'status':
                logEntry = `- Changed **${label}** from ${formatValue(oldValue)} to ${formatValue(newValue)}.`;
                break;
            case 'description':
                 logEntry = `- Changed **${label}** from ${formatValue(oldValue, v => `${v.substring(0, 30)}...`)} to ${formatValue(newValue, v => `${v.substring(0, 30)}...`)}.`;
                 break;
            case 'developers':
            case 'testers': {
                const nameMap = key === 'developers' ? developersById : testersById;
                const oldSet = new Set(oldValue as string[] || []);
                const newSet = new Set(newValue as string[] || []);
                const added = [...newSet].filter(id => !oldSet.has(id)).map(id => nameMap.get(id) || id);
                const removed = [...oldSet].filter(id => !newSet.has(id)).map(id => nameMap.get(id) || id);

                if (added.length > 0) changes.push(`- Assigned ${label}: **${added.join(', ')}**.`);
                if (removed.length > 0) changes.push(`- Unassigned ${label}: **${removed.join(', ')}**.`);
                break;
            }
            case 'repositories': {
                const oldRepos = Array.isArray(oldValue) ? oldValue : [];
                const newRepos = Array.isArray(newValue) ? newValue : [];
                if(JSON.stringify(oldRepos.sort()) !== JSON.stringify(newRepos.sort())) {
                    logEntry = `- Changed **${label}** to *${newRepos.join(', ') || 'empty'}*.`;
                }
                break;
            }
            case 'devStartDate':
            case 'devEndDate':
            case 'qaStartDate':
            case 'qaEndDate': {
                const oldDate = oldValue ? new Date(oldValue as string).toISOString() : null;
                const newDate = newValue ? new Date(newValue as string).toISOString() : null;
                if(oldDate !== newDate) {
                    logEntry = `- Changed **${label}** to *${newDate ? format(new Date(newDate), 'PPP') : 'empty'}*.`;
                }
                break;
            }
            case 'attachments': {
                const oldAttachments = new Map((oldValue as Attachment[] || []).map(a => [a.url, a.name]));
                const newAttachments = new Map((newValue as Attachment[] || []).map(a => [a.url, a.name]));
                
                newAttachments.forEach((name, url) => {
                    if (!oldAttachments.has(url)) {
                        changes.push(`- Added attachment: *"${name}"*.`);
                    }
                });

                oldAttachments.forEach((name, url) => {
                    if (!newAttachments.has(url)) {
                        changes.push(`- Removed attachment: *"${name}"*.`);
                    }
                });
                break;
            }
            case 'reminder':
                if (oldValue && !newValue) {
                    logEntry = '- Removed the reminder from the task.';
                } else if (!oldValue && newValue) {
                    logEntry = `- Set a new reminder: *"${(newValue as string).substring(0, 50)}..."*`;
                } else {
                    logEntry = `- Updated the reminder text to: *"${(newValue as string).substring(0, 50)}..."*`;
                }
                break;
            case 'reminderExpiresAt':
                 if (newValue && newValue !== oldValue) {
                    logEntry = `- Set reminder expiration to *${format(new Date(newValue as string), timeFormatString)}*.`;
                 } else if (!newValue && oldValue) {
                    logEntry = '- Removed the reminder expiration date.';
                 }
                break;
        }

        if (logEntry) changes.push(logEntry);
    });

    if (newTaskData.customFields) {
        const oldCustomFields = oldTask.customFields || {};
        const newCustomFields = newTaskData.customFields;
        uiConfig.fields.forEach(field => {
            if (field.isCustom && field.key in newCustomFields) {
                const oldValue = oldCustomFields[field.key];
                const newValue = newCustomFields[field.key];
                if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    changes.push(`- Changed **${field.label}** from ${formatValue(oldValue)} to ${formatValue(newValue)}.`);
                }
            }
        });
    }
    
    // Detailed deployment check
    const allEnvs = uiConfig.environments || [];
    allEnvs.forEach(env => {
        const oldStatus = oldTask.deploymentStatus?.[env] ?? false;
        const newStatus = 'deploymentStatus' in newTaskData ? (newTaskData.deploymentStatus?.[env] ?? false) : oldStatus;
        
        const oldDate = oldTask.deploymentDates?.[env] ?? null;
        const newDate = 'deploymentDates' in newTaskData ? (newTaskData.deploymentDates?.[env] ?? null) : oldDate;

        const oldDeployed = oldStatus && (env === 'dev' || !!oldDate);
        const newDeployed = newStatus && (env === 'dev' || !!newDate);
        
        if (oldDeployed !== newDeployed) {
            changes.push(`- Changed **${env.charAt(0).toUpperCase() + env.slice(1)}** deployment to *${newDeployed ? 'Deployed' : 'Pending'}*.`);
        }
    });

    // Detailed PR links check
    if ('prLinks' in newTaskData) {
        const prChanges: string[] = [];
        const oldLinks = oldTask.prLinks || {};
        const newLinks = newTaskData.prLinks || {};
        const allPrEnvs = [...new Set([...Object.keys(oldLinks), ...Object.keys(newLinks)])];

        allPrEnvs.forEach(env => {
            const oldRepoLinks = oldLinks[env] || {};
            const newRepoLinks = newLinks[env] || {};
            const allRepos = [...new Set([...Object.keys(oldRepoLinks), ...Object.keys(newRepoLinks)])];

            allRepos.forEach(repo => {
                const oldIds = new Set((oldRepoLinks[repo] || '').split(',').map(s => s.trim()).filter(Boolean));
                const newIds = new Set((newRepoLinks[repo] || '').split(',').map(s => s.trim()).filter(Boolean));

                const added = [...newIds].filter(id => !oldIds.has(id));
                const removed = [...oldIds].filter(id => !newIds.has(id));

                added.forEach(id => prChanges.push(`- Added PR **#${id}** to *${repo} (${env})*.`));
                removed.forEach(id => prChanges.push(`- Removed PR **#${id}** from *${repo} (${env})*.`));
            });
        });

        if (prChanges.length > 0) {
            changes.push(`Updated **Pull Request links**:\n${prChanges.join('\n')}`);
        }
    }


    if (changes.length === 0) return null;
    return `Updated task "${taskTitle}":\n${changes.join('\n')}`;
};

export function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | undefined {
  const data = getAppData();
  const activeCompanyId = data.activeCompanyId;
  const companyData = data.companyData[activeCompanyId];
  if (!companyData) return undefined;
  
  if (taskData.repositories && !Array.isArray(taskData.repositories)) {
    taskData.repositories = [taskData.repositories];
  }

  let oldTask: Task | undefined;
  let taskIndex: number = -1;
  let isBinned = false;

  taskIndex = companyData.tasks.findIndex(task => task.id === id);
  if (taskIndex !== -1) {
    oldTask = cloneDeep(companyData.tasks[taskIndex]);
  } else {
    const trash = companyData.trash || [];
    taskIndex = trash.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      oldTask = cloneDeep(trash[taskIndex]);
      isBinned = true;
    }
  }

  if (!oldTask || taskIndex === -1) return undefined;
  
  const uiConfig = companyData.uiConfig;
  const logMessage = generateTaskUpdateLogs(oldTask, taskData, uiConfig, companyData.developers, companyData.testers);

  if(logMessage) {
    _addLog(companyData, { message: logMessage, taskId: id });
  }

  const updatedTask = { ...oldTask, ...taskData, updatedAt: new Date().toISOString() };
  
  if (isBinned) {
    (companyData.trash || [])[taskIndex] = updatedTask;
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
    return (companyData.trash || []).sort((a,b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
}

export function moveTaskToBin(id: string): boolean {
  const data = getAppData();
  const companyData = data.companyData[data.activeCompanyId];
  if (!companyData) return false;

  const taskIndex = companyData.tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) return false;
  
  const [taskToBin] = companyData.tasks.splice(taskIndex, 1);
  taskToBin.deletedAt = new Date().toISOString();
  companyData.trash = companyData.trash || [];
  companyData.trash.unshift(taskToBin);
  
  _addLog(companyData, { message: `Moved task "${taskToBin.title}" to the bin.`, taskId: id });

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
        _addLog(companyData, { message: `Moved task "${task.title}" to the bin.`, taskId: task.id });
    });
    
    _addLog(companyData, { message: `Moved ${tasksToBin.length} task(s) to the bin.` });

    companyData.tasks = companyData.tasks.filter(task => !ids.includes(task.id));
    companyData.trash = companyData.trash || [];
    companyData.trash.unshift(...tasksToBin);
    
    setAppData(data);
    return true;
}

export function restoreTask(id: string): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.trash) return false;

    const taskIndex = companyData.trash.findIndex(task => task.id === id);
    if (taskIndex === -1) return false;

    const [taskToRestore] = companyData.trash.splice(taskIndex, 1);
    delete taskToRestore.deletedAt;
    companyData.tasks.unshift(taskToRestore);

    _addLog(companyData, { message: `Restored task "${taskToRestore.title}" from the bin.`, taskId: id });
    setAppData(data);
    return true;
}

export function restoreMultipleTasks(ids: string[]): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.trash) return false;

    const tasksToRestore = companyData.trash.filter(task => ids.includes(task.id));
    if (tasksToRestore.length === 0) return false;

    tasksToRestore.forEach(task => {
        delete task.deletedAt;
        _addLog(companyData, { message: `Restored task "${task.title}" from the bin.`, taskId: task.id });
    });

    _addLog(companyData, { message: `Restored ${tasksToRestore.length} task(s) from the bin.` });

    companyData.trash = companyData.trash.filter(task => !ids.includes(task.id));
    companyData.tasks.unshift(...tasksToRestore);
    
    setAppData(data);
    return true;
}

export function permanentlyDeleteTask(id: string): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.trash) return false;
    
    const taskToDelete = companyData.trash.find(task => task.id === id);
    if (!taskToDelete) return false;

    companyData.trash = companyData.trash.filter(task => task.id !== id);
    
    _addLog(companyData, { message: `Permanently deleted task "${taskToDelete.title}".` });
    
    setAppData(data);
    return true;
}

export function permanentlyDeleteMultipleTasks(ids: string[]): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.trash) return false;
    
    const tasksToDelete = companyData.trash.filter(task => ids.includes(task.id));
    if (tasksToDelete.length === 0) return false;
    
    companyData.trash = companyData.trash.filter(task => !ids.includes(task.id));
    
    _addLog(companyData, { message: `Permanently deleted ${tasksToDelete.length} task(s).` });

    setAppData(data);
    return true;
}

export function emptyBin(): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.trash || companyData.trash.length === 0) return false;
    
    const logMessage = `Emptied all ${companyData.trash.length} tasks from the bin.`;
    companyData.trash = [];

    _addLog(companyData, { message: logMessage });

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

    if (/^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedName)) {
        throw new Error("Invalid name format. Cannot be the same as an ID.");
    }
    
    const newPerson: Person = {
        id: `${type}-${crypto.randomUUID()}`,
        name: trimmedName,
        email: personData.email || '',
        phone: personData.phone || '',
        additionalFields: personData.additionalFields || [],
    };

    if (type === 'developer') {
        companyData.developers = [...people, newPerson];
    } else {
        companyData.testers = [...people, newPerson];
    }
    
    _addLog(companyData, { message: `Added new ${type}: "${newPerson.name}".` });
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
        if (/^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4-}-[0-9a-f]{12}$/i.test(trimmedName)) {
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
        _addLog(companyData, { message: `Renamed ${type} from "${oldName}" to "${updatedPerson.name}".` });
    } else {
        _addLog(companyData, { message: `Updated details for ${type} "${updatedPerson.name}".` });
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
    
    _addLog(companyData, { message: `Deleted ${type}: "${personName}".` });
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
export function addComment(taskId: string, commentText: string): Task | undefined {
  const task = getTaskById(taskId);
  if (!task) return undefined;

  const newComment: Comment = {
    text: commentText,
    timestamp: new Date().toISOString(),
  };

  const newComments = [...(task.comments || []), newComment];
  
  const data = getAppData();
  const companyData = data.companyData[data.activeCompanyId];
  if (!companyData) return undefined;
  _addLog(companyData, { message: `Added a comment to task "${task.title}": "${commentText.substring(0, 50)}..."`, taskId });
  setAppData(data);
  
  return updateTask(taskId, { comments: newComments });
}

export function updateComment(taskId: string, index: number, newCommentText: string): Task | undefined {
   const task = getTaskById(taskId);
   if (!task || !task.comments || index < 0 || index >= task.comments.length) return undefined;
   
   const newComments = [...task.comments];
   newComments[index] = {
     text: newCommentText,
     timestamp: new Date().toISOString(),
   };
   
   const data = getAppData();
   const companyData = data.companyData[data.activeCompanyId];
   if (!companyData) return undefined;
   _addLog(companyData, { message: `Updated a comment on task "${task.title}".`, taskId });
   setAppData(data);

   return updateTask(taskId, { comments: newComments });
}

export function deleteComment(taskId: string, index: number): Task | undefined {
   const task = getTaskById(taskId);
   if (!task || !task.comments || index < 0 || index >= task.comments.length) return undefined;
   
   const deletedComment = task.comments[index];
   const newComments = task.comments.filter((_, i) => i !== index);

   const data = getAppData();
   const companyData = data.companyData[data.activeCompanyId];
   if (!companyData) return undefined;
   
   const commentText = typeof deletedComment === 'string' ? deletedComment : deletedComment.text;
   _addLog(companyData, { message: `Deleted a comment from task "${task.title}": "${commentText.substring(0, 50)}..."`, taskId });
   setAppData(data);

   return updateTask(taskId, { comments: newComments });
}

// Global logs page view
export function getAggregatedLogs(): Log[] {
    const logs = getLogs();

    // Get timestamps of all aggregate logs. These are the markers for bulk operations.
    const aggregateLogMarkers = new Set(
        logs.filter(log => log.id.startsWith('log-aggregate-'))
            .map(log => log.timestamp)
    );

    const visibleLogs = logs.filter(log => {
        // Always show aggregate logs themselves.
        if (log.id.startsWith('log-aggregate-')) {
            return true;
        }

        // Hide individual logs that are part of a bulk action.
        if (aggregateLogMarkers.has(log.timestamp)) {
            // Check if there's an aggregate log with the same timestamp
            const isPartOfBulk = logs.some(aggLog => 
                aggLog.id.startsWith('log-aggregate-') && 
                aggLog.timestamp === log.timestamp
            );
            if (isPartOfBulk) {
                return false;
            }
        }
        
        // If it's not an aggregate log and not part of a known bulk operation, show it.
        return true;
    });

    return visibleLogs;
}

export function clearExpiredReminders(): { updatedTaskIds: string[], unpinnedTaskIds: string[] } {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];
    if (!companyData) return { updatedTaskIds: [], unpinnedTaskIds: [] };

    const now = new Date();
    const updatedTaskIds: string[] = [];
    const unpinnedTaskIds: string[] = [];

    const processTask = (task: Task) => {
        if (task.reminder && task.reminderExpiresAt && new Date(task.reminderExpiresAt) < now) {
            task.reminder = null;
            task.reminderExpiresAt = null;
            task.updatedAt = now.toISOString();
            updatedTaskIds.push(task.id);
            unpinnedTaskIds.push(task.id); // The client will use this to update its state
            _addLog(companyData, { message: `Reminder expired and was cleared for task "${task.title}".`, taskId: task.id });
        }
    };

    companyData.tasks.forEach(processTask);
    (companyData.trash || []).forEach(processTask); // Also clear from binned tasks

    if (updatedTaskIds.length > 0) {
        setAppData(data);
    }

    return { updatedTaskIds, unpinnedTaskIds };
}

// General Reminder Functions
export function getGeneralReminders(): GeneralReminder[] {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    return companyData?.generalReminders || [];
}

export function addGeneralReminder(text: string): GeneralReminder {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) throw new Error("Cannot add reminder, no active company data found.");

    const newReminder: GeneralReminder = {
        id: `gen-reminder-${crypto.randomUUID()}`,
        text,
        createdAt: new Date().toISOString(),
    };

    companyData.generalReminders = [newReminder, ...(companyData.generalReminders || [])];
    _addLog(companyData, { message: `Added a new general reminder.` });
    setAppData(data);
    return newReminder;
}

export function updateGeneralReminder(id: string, text: string): GeneralReminder | undefined {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.generalReminders) return undefined;

    const reminderIndex = companyData.generalReminders.findIndex(r => r.id === id);
    if (reminderIndex === -1) return undefined;

    const updatedReminder = { ...companyData.generalReminders[reminderIndex], text };
    companyData.generalReminders[reminderIndex] = updatedReminder;
    
    _addLog(companyData, { message: `Updated a general reminder.` });
    setAppData(data);
    return updatedReminder;
}

export function deleteGeneralReminder(id: string): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.generalReminders) return false;
    
    const initialLength = companyData.generalReminders.length;
    companyData.generalReminders = companyData.generalReminders.filter(r => r.id !== id);

    if (companyData.generalReminders.length < initialLength) {
        _addLog(companyData, { message: `Dismissed a general reminder.` });
        setAppData(data);
        return true;
    }
    return false;
}

// Note Functions
export function getNotes(): Note[] {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData) return [];
    
    let needsUpdate = false;
    const notes = companyData.notes || [];
    notes.forEach((note, index) => {
        if (!note.layout || typeof note.layout.x !== 'number' || typeof note.layout.y !== 'number') {
            needsUpdate = true;
            note.layout = {
                i: note.id,
                x: (index * 4) % 12,
                y: Math.floor(index / 3) * 4,
                w: 4,
                h: 4,
                minW: 2,
                minH: 2
            };
        }
    });

    if (needsUpdate) {
        setAppData(data);
    }

    return notes.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function addNote(noteData: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'layout'>>): Note {
    const data = getAppData();
    const activeCompanyId = data.activeCompanyId;
    const companyData = data.companyData[activeCompanyId];
    const notes = companyData.notes || [];
    
    const calculateNewY = (): number => {
        if (notes.length === 0) {
            return 0; // Return 0 if there are no notes.
        }
        // Find the maximum y + h of all notes to place the new one at the bottom.
        return Math.max(0, ...notes.map(n => (n.layout.y || 0) + (n.layout.h || 0)));
    };

    const now = new Date().toISOString();
    const newNoteId = `note-${crypto.randomUUID()}`;
    const newNote: Note = {
        id: newNoteId,
        title: noteData.title || '',
        content: noteData.content || '',
        createdAt: now,
        updatedAt: now,
        layout: {
            i: newNoteId,
            x: (notes.length * 4) % 12,
            y: calculateNewY(),
            w: 4,
            h: 4,
            minW: 2,
            minH: 2,
        },
    };

    companyData.notes = [newNote, ...notes];
    const logTitle = newNote.title || `note created at ${format(new Date(now), 'p')}`;
    _addLog(companyData, { message: `Created new note: **"${logTitle}"**.` });

    setAppData(data);
    return newNote;
}

export function updateNote(id: string, noteData: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Note | undefined {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.notes) return undefined;

    const noteIndex = companyData.notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return undefined;

    const oldNote = companyData.notes[noteIndex];
    const updatedNote = { ...oldNote, ...noteData, updatedAt: new Date().toISOString() };
    companyData.notes[noteIndex] = updatedNote;

    const logTitle = updatedNote.title || `note created at ${format(new Date(updatedNote.createdAt), 'p')}`;
    _addLog(companyData, { message: `Updated note: **"${logTitle}"**.` });

    setAppData(data);
    return updatedNote;
}

export function deleteNote(id: string): boolean {
    const data = getAppData();
    const companyData = data.companyData[data.activeCompanyId];
    if (!companyData || !companyData.notes) return false;
    
    const noteIndex = companyData.notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return false;

    const [deletedNote] = companyData.notes.splice(noteIndex, 1);
    
    const logTitle = deletedNote.title || `note created at ${format(new Date(deletedNote.createdAt), 'p')}`;
    _addLog(companyData, { message: `Deleted note: **"${logTitle}"**.` });
    
    // Also move to the main bin for potential restoration
    const asTask: Task = {
        id: deletedNote.id,
        title: `Note: ${deletedNote.title || 'Untitled'}`,
        description: deletedNote.content,
        status: 'Archived',
        createdAt: deletedNote.createdAt,
        updatedAt: deletedNote.updatedAt,
        deletedAt: new Date().toISOString(),
    }
    companyData.trash = [asTask, ...(companyData.trash || [])];

    setAppData(data);
    return true;
}

export function updateNoteLayouts(layouts: NoteLayout[]): void {
  const data = getAppData();
  const companyData = data.companyData[data.activeCompanyId];
  if (!companyData || !companyData.notes) return;

  const notesMap = new Map(companyData.notes.map(note => [note.id, note]));

  layouts.forEach(layout => {
    const note = notesMap.get(layout.i);
    if (note) {
      note.layout = { ...note.layout, ...layout };
      note.updatedAt = new Date().toISOString();
    }
  });

  setAppData(data);
  // No log for layout changes to avoid spamming the logs
}
