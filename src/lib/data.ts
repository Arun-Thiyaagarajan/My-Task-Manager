import type { Task, Developer } from './types';

// In a real application, this would be a database.
// For this demo, we're using localStorage.

const initialTasks: Task[] = [];
const initialDevelopers: Developer[] = ['Arun'];

const TASKS_KEY = 'taskflow_tasks';
const DEVELOPERS_KEY = 'taskflow_developers';

// Helper to get and initialize data from localStorage
const getLocalStorage = <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') {
        return fallback;
    }
    const stored = window.localStorage.getItem(key);
    if (!stored) {
        window.localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
    }
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return fallback;
    }
}

// Helper to set data in localStorage
const setLocalStorage = <T>(key: string, value: T) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
}

export function getTasks(): Task[] {
  return getLocalStorage(TASKS_KEY, initialTasks);
}

export function getTaskById(id: string): Task | undefined {
  const tasks = getTasks();
  return tasks.find(task => task.id === id);
}

export function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>): Task {
  const tasks = getTasks();
  const now = new Date().toISOString();
  const newTask: Task = {
    id: `task-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    ...taskData,
    comments: [],
    attachments: taskData.attachments ?? [],
    prLinks: taskData.prLinks ?? {},
    deploymentStatus: taskData.deploymentStatus ?? {},
    developers: taskData.developers ?? [],
    qaIssueIds: taskData.qaIssueIds ?? [],
  };
  const updatedTasks = [newTask, ...tasks];
  setLocalStorage(TASKS_KEY, updatedTasks);
  return newTask;
}

export function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | undefined {
  const tasks = getTasks();
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return undefined;
  }
  
  const updatedTask = { 
    ...tasks[taskIndex], 
    ...taskData,
    updatedAt: new Date().toISOString()
  };
  
  tasks[taskIndex] = updatedTask;
  setLocalStorage(TASKS_KEY, tasks);
  return updatedTask;
}

export function deleteTask(id: string): boolean {
  let tasks = getTasks();
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return false;
  }
  tasks.splice(taskIndex, 1);
  setLocalStorage(TASKS_KEY, tasks);
  return true;
}

export function getDevelopers(): Developer[] {
    return getLocalStorage(DEVELOPERS_KEY, initialDevelopers);
}

export function addDeveloper(name: string): Developer {
    const developers = getDevelopers();
    const newDeveloper: Developer = name;
    if (!developers.includes(newDeveloper)) {
        const updatedDevelopers = [...developers, newDeveloper];
        setLocalStorage(DEVELOPERS_KEY, updatedDevelopers);
    }
    return newDeveloper;
}

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
