import type { Task } from './types';

// In a real application, this would be a database.
// For this demo, we're using an in-memory array that resets on server restart.
let tasks: Task[] = [
    {
    id: 'task-1',
    title: 'Implement new dashboard widgets',
    description: 'Develop and integrate new interactive widgets for the main dashboard to display key metrics. The widgets should be responsive and update in real-time.',
    status: 'In Progress',
    repository: 'UI-Dashboard',
    azureId: 'https://dev.azure.com/your-org/your-project/_workitems/edit/101',
    prLinks: {
      dev: ['https://github.com/your-org/ui-dashboard/pull/123'],
      stage: ['https://github.com/your-org/ui-dashboard/pull/122'],
    },
  },
  {
    id: 'task-2',
    title: 'Fix user authentication bug',
    description: 'A critical bug has been reported where users are unable to log in using their social media accounts. This needs to be investigated and patched immediately.',
    status: 'Done',
    repository: 'API-Export',
    azureId: 'https://dev.azure.com/your-org/your-project/_workitems/edit/102',
    prLinks: {
      dev: ['https://github.com/your-org/api-export/pull/55'],
      stage: ['https://github.com/your-org/api-export/pull/54'],
      production: ['https://github.com/your-org/api-export/pull/53'],
    },
  },
  {
    id: 'task-3',
    title: 'Update email templates design',
    description: 'The marketing team has provided new designs for all transactional emails. Update the existing templates to match the new branding guidelines.',
    status: 'Not Started',
    repository: 'Templates',
    prLinks: {},
  },
  {
    id: 'task-4',
    title: 'Refactor admin panel state management',
    description: 'The current state management in the admin panel is causing performance issues. Refactor it to use a more efficient library or pattern.',
    status: 'In Progress',
    repository: 'UI-Admin',
    azureId: 'https://dev.azure.com/your-org/your-project/_workitems/edit/104',
    prLinks: {
      dev: ['https://github.com/your-org/ui-admin/pull/201'],
    },
  },
  {
    id: 'task-5',
    title: 'Add CSV export functionality',
    description: 'Users need to be able to export their data as a CSV file. Implement this feature in the API and connect it to the UI.',
    status: 'Done',
    repository: 'API-Export',
    prLinks: {
      dev: ['https://github.com/your-org/api-export/pull/78'],
      stage: ['https://github.com/your-org/api-export/pull/77'],
      production: ['https://github.com/your-org/api-export/pull/76'],
    },
  },
  {
    id: 'task-6',
    title: 'Design user profile page',
    description: 'Create a new user profile page where users can view and edit their personal information and settings. Wireframes and UI mockups are required before implementation.',
    status: 'Not Started',
    repository: 'UI-Dashboard',
    azureId: 'https://dev.azure.com/your-org/your-project/_workitems/edit/106',
    prLinks: {},
  },
    {
    id: 'task-7',
    title: 'Integrate third-party analytics',
    description: 'Integrate a new analytics service to track user engagement and feature usage across the application. This involves adding tracking scripts and sending events.',
    status: 'In Progress',
    repository: 'Other',
    prLinks: {
      dev: ['https://github.com/your-org/other-repo/pull/11'],
    },
  },
  {
    id: 'task-8',
    title: 'Improve mobile responsiveness',
    description: 'Several pages are not rendering correctly on mobile devices. A full review and fix of the responsive design is needed to ensure a good user experience on all screen sizes.',
    status: 'Not Started',
    repository: 'UI-Dashboard',
    prLinks: {},
  },
];

export function getTasks(): Task[] {
  // Return a copy to prevent direct mutation of the array on the client
  return [...tasks];
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find(task => task.id === id);
}

export function addTask(taskData: Omit<Task, 'id' | 'prLinks'>): Task {
  const newTask: Task = {
    ...taskData,
    id: `task-${Date.now()}`,
    prLinks: {},
  };
  tasks.unshift(newTask);
  return newTask;
}

export function updateTask(id: string, taskData: Partial<Task>): Task | undefined {
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return undefined;
  }
  tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
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
