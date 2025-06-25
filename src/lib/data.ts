import type { Task } from './types';

// In a real application, this would be a database.
// For this demo, we're using an in-memory array that resets on server restart.
let tasks: Task[] = [
    {
    id: 'task-1',
    title: 'Implement new dashboard widgets',
    description: 'Develop and integrate new interactive widgets for the main dashboard to display key metrics. The widgets should be responsive and update in real-time.',
    status: 'In Progress',
    repositories: ['UI-Dashboard'],
    azureWorkItemId: '101',
    prLinks: {
      dev: ['https://github.com/your-org/ui-dashboard/pull/123'],
      stage: ['https://github.com/your-org/ui-dashboard/pull/122'],
    },
    developers: ['Alice', 'Bob'],
    devStartDate: '2024-07-01T00:00:00.000Z',
    devEndDate: '2024-07-15T00:00:00.000Z',
    createdAt: '2024-06-20T00:00:00.000Z',
    updatedAt: '2024-07-05T00:00:00.000Z',
  },
  {
    id: 'task-2',
    title: 'Fix user authentication bug',
    description: 'A critical bug has been reported where users are unable to log in using their social media accounts. This needs to be investigated and patched immediately.',
    status: 'Done',
    repositories: ['API-Export', 'UI-Admin'],
    azureWorkItemId: '102',
    prLinks: {
      dev: ['https://github.com/your-org/api-export/pull/55'],
      stage: ['https://github.com/your-org/api-export/pull/54'],
      production: ['https://github.com/your-org/api-export/pull/53'],
    },
    developers: ['Charlie'],
    devStartDate: '2024-06-10T00:00:00.000Z',
    devEndDate: '2024-06-12T00:00:00.000Z',
    qaStartDate: '2024-06-13T00:00:00.000Z',
    qaEndDate: '2024-06-14T00:00:00.000Z',
    createdAt: '2024-06-09T00:00:00.000Z',
    updatedAt: '2024-06-15T00:00:00.000Z',
  },
  {
    id: 'task-3',
    title: 'Update email templates design',
    description: 'The marketing team has provided new designs for all transactional emails. Update the existing templates to match the new branding guidelines.',
    status: 'To Do',
    repositories: ['Templates'],
    prLinks: {},
    developers: ['Dana'],
    createdAt: '2024-07-10T00:00:00.000Z',
    updatedAt: '2024-07-10T00:00:00.000Z',
  },
  {
    id: 'task-4',
    title: 'Refactor admin panel state management',
    description: 'The current state management in the admin panel is causing performance issues. Refactor it to use a more efficient library or pattern.',
    status: 'In Progress',
    repositories: ['UI-Admin'],
    azureWorkItemId: '104',
    prLinks: {
      dev: ['https://github.com/your-org/ui-admin/pull/201'],
    },
    developers: ['Bob', 'Eve'],
    createdAt: '2024-07-02T00:00:00.000Z',
    updatedAt: '2024-07-08T00:00:00.000Z',
  },
  {
    id: 'task-5',
    title: 'Add CSV export functionality',
    description: 'Users need to be able to export their data as a CSV file. Implement this feature in the API and connect it to the UI.',
    status: 'Done',
    repositories: ['API-Export'],
    prLinks: {
      dev: ['https://github.com/your-org/api-export/pull/78'],
      stage: ['https://github.com/your-org/api-export/pull/77'],
      production: ['https://github.com/your-org/api-export/pull/76'],
    },
    developers: ['Alice'],
    createdAt: '2024-05-15T00:00:00.000Z',
    updatedAt: '2024-05-20T00:00:00.000Z',
  },
  {
    id: 'task-6',
    title: 'Design user profile page',
    description: 'Create a new user profile page where users can view and edit their personal information and settings. Wireframes and UI mockups are required before implementation.',
    status: 'To Do',
    repositories: ['UI-Dashboard'],
    azureWorkItemId: '106',
    prLinks: {},
    createdAt: '2024-07-11T00:00:00.000Z',
    updatedAt: '2024-07-11T00:00:00.000Z',
  },
    {
    id: 'task-7',
    title: 'Integrate third-party analytics',
    description: 'Integrate a new analytics service to track user engagement and feature usage across the application. This involves adding tracking scripts and sending events.',
    status: 'Code Review',
    repositories: ['Other'],
    prLinks: {
      dev: ['https://github.com/your-org/other-repo/pull/11'],
    },
    developers: ['Dana', 'Charlie'],
    createdAt: '2024-07-01T00:00:00.000Z',
    updatedAt: '2024-07-03T00:00:00.000Z',
  },
  {
    id: 'task-8',
    title: 'Improve mobile responsiveness',
    description: 'Several pages are not rendering correctly on mobile devices. A full review and fix of the responsive design is needed to ensure a good user experience on all screen sizes.',
    status: 'QA',
    repositories: ['UI-Dashboard', 'UI-Admin'],
    prLinks: {
      dev: ['https://github.com/your-org/ui-dashboard/pull/300'],
      stage: ['https://github.com/your-org/ui-dashboard/pull/299'],
    },
    developers: ['Eve'],
    createdAt: '2024-07-05T00:00:00.000Z',
    updatedAt: '2024-07-09T00:00:00.000Z',
  },
];

export function getTasks(): Task[] {
  // Return a copy to prevent direct mutation of the array on the client
  return [...tasks];
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find(task => task.id === id);
}

export function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const now = new Date().toISOString();
  const newTask: Task = {
    id: `task-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    ...taskData,
    prLinks: taskData.prLinks ?? {},
    developers: taskData.developers ?? [],
  };
  tasks.unshift(newTask);
  return newTask;
}

export function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | undefined {
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return undefined;
  }
  tasks[taskIndex] = { 
    ...tasks[taskIndex], 
    ...taskData,
    updatedAt: new Date().toISOString()
  };
  return tasks[taskIndex];
}

export function deleteTask(id: string): boolean {
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return false;
  }
  tasks.splice(taskIndex, 1);
  return true;
}
