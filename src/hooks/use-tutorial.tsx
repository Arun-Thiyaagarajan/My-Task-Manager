
'use client';

import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useRouter, usePathname } from "next/navigation";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { getUiConfig } from "@/lib/data";

export function useTutorial() {
    const router = useRouter();
    const pathname = usePathname();
    const { prompt } = useUnsavedChanges();
    
    const navigateTo = (path: string, onNavigated: () => void) => {
        if (pathname === path) {
            onNavigated();
        } else {
            prompt(() => {
                router.push(path);
                // A timeout is needed to allow the page to render before driver.js tries to find the element
                setTimeout(() => onNavigated(), 500);
            });
        }
    };

    const homePageSteps: DriveStep[] = [
        {
            element: '#task-filters',
            popover: {
                title: 'Filter & Search Tasks',
                description: 'Easily find any task by using the search bar or filtering by status, repository, or deployment.'
            }
        },
        {
            element: '#view-mode-toggle',
            popover: {
                title: 'Switch Views',
                description: 'You can switch between a visual Grid view and a detailed Table view to suit your workflow.'
            }
        },
        {
            element: '[id^="task-card-reminder-btn-"]',
            popover: {
                title: 'Set Reminders',
                description: 'Quickly set a reminder for a task by clicking the bell icon. You can also pin important reminders to the main page.'
            }
        },
        {
            element: '.group\\/card .text-muted-foreground.line-clamp-2',
            popover: {
                title: 'AI-Powered Summaries',
                description: 'For longer descriptions, the system automatically generates a concise one-sentence summary to help you quickly grasp the task\'s objective.'
            }
        },
         {
            element: '#new-task-btn',
            popover: {
                title: 'Create a New Task',
                description: 'Click here to start a new task. The form allows you to add all necessary details.'
            },
            onNextClick: ({ driver }) => {
                driver.destroy();
                navigateTo('/tasks/new', () => {
                    startTutorialForPage('/tasks/new', 0);
                });
            }
        },
    ];
    
    const newTaskPageSteps: DriveStep[] = [
        {
            element: '#task-form-main-card',
            popover: {
                title: 'Add Task Details',
                description: 'Fill in core details like title, description, status, and assignees.'
            },
            onPrevClick: ({ driver }) => {
                driver.destroy();
                navigateTo('/', () => {
                    startTutorialForPage('/', homePageSteps.length - 1);
                });
            }
        },
        {
            element: '#task-form-submit',
            popover: {
                title: 'Save Your Task',
                description: 'Once you\'re done, click here to create the task and return to the main list.'
            }
        }
    ];

    const taskDetailPageSteps: DriveStep[] = [
        {
            element: '.group\\/card',
            popover: {
                title: 'Task Details',
                description: 'This is the main view for a single task, showing its title, description, and current status.'
            },
        },
        {
            element: 'div.space-y-1.text-sm > div:first-child',
            popover: {
                title: 'Update Deployments',
                description: 'Click on any environment badge to quickly toggle its deployment status between "Pending" and "Deployed".'
            }
        },
        {
            element: 'button[aria-label="Set Reminder"]',
            popover: {
                title: 'Set Reminders',
                description: 'Click the bell icon to add a reminder note to this task. You can also pin it to the main page for visibility.'
            }
        },
    ];

    const settingsPageSteps: DriveStep[] = [
        {
            element: '#settings-field-config-card',
            popover: {
                title: 'Field Configuration',
                description: 'Here you can edit, reorder, and manage all the fields that appear on your tasks.'
            }
        },
         {
             element: '#add-field-button',
             popover: {
                title: 'Add Custom Fields',
                description: 'Click here to create your own custom fields to tailor the application to your specific needs (e.g., text, date, select, etc.).'
             }
        },
        {
            element: 'div[id*="settings-people-management"]',
            popover: {
                title: 'Manage People',
                description: 'Add and manage your lists of developers and testers in these sections.'
            }
        },
        {
            element: '#settings-environment-card',
            popover: {
                title: 'Manage Environments',
                description: 'Define your deployment environments beyond the standard dev, stage, and production.'
            }
        },
        {
            element: 'div:has(> h2.flex.items-center.gap-2.text-destructive)',
            popover: {
                title: 'Data Management',
                description: 'Export your settings for backup or import them into another workspace. You can also clear all local data from this browser.'
            }
        },
        {
            element: 'div:has(> div > h2.flex.items-center.gap-2)',
            popover: {
                title: 'Feature Management',
                description: 'Enable or disable features like task reminders, this tutorial, and automatic data backups.'
            }
        }
    ];
    
    const notesPageSteps: DriveStep[] = [
        {
            element: 'button.w-full.text-left',
            popover: {
                title: 'Create a Note',
                description: 'Click here to create a new note. You can also use the shortcut (⌘ + /) from any page.'
            }
        },
        {
            element: '.flex.items-center.gap-2.flex-wrap',
            popover: {
                title: 'Manage Your Notes',
                description: 'You can export all notes, import from a file, select multiple notes for bulk actions, or reset the entire grid layout.'
            }
        },
        {
            element: '.grid.grid-cols-1.sm\\:grid-cols-2.gap-4',
            popover: {
                title: 'Filter & Search',
                description: 'Quickly find notes by searching their content or filtering by date.'
            }
        },
        {
            element: '.note-card-content',
            popover: {
                title: 'View & Edit',
                description: 'Click on a note\'s content to open the full viewer, where you can also edit or delete it.'
            }
        },
        {
            element: '.note-card-footer',
            popover: {
                title: 'Rearrange Notes',
                description: 'Click and drag this handle to rearrange your notes on the grid however you like.'
            }
        }
    ];

    const dashboardPageSteps: DriveStep[] = [
        {
            element: '.grid.grid-cols-1.lg\\:grid-cols-2.gap-8',
            popover: {
                title: 'Dashboard Overview',
                description: 'This dashboard provides a high-level overview of your team\'s progress with visual charts tracking tasks by status, assignees, and deployments.'
            }
        }
    ];

    const logsPageSteps: DriveStep[] = [
        {
            element: '.relative.flex.items-center.w-full.max-w-sm',
            popover: {
                title: 'Activity Logs',
                description: 'Here you can view a complete, filterable audit trail of every change made to tasks and settings.'
            }
        }
    ];

    const binPageSteps: DriveStep[] = [
        {
            element: '.border.rounded-lg.overflow-x-auto',
            popover: {
                title: 'Deleted Items Bin',
                description: 'Deleted tasks are held here for 30 days, allowing you to restore them anytime.'
            }
        }
    ];

    const startTutorial = () => {
        const config = getUiConfig();
        if(!config.tutorialEnabled) return;
        startTutorialForPage(pathname);
    };

    const startTutorialForPage = (path: string, initialStep: number = 0) => {
        let steps: DriveStep[] = [];
        
        if (path === '/') {
            steps = homePageSteps;
        } else if (path.startsWith('/tasks/new')) {
             steps = newTaskPageSteps;
        } else if (path.startsWith('/tasks/')) {
            steps = taskDetailPageSteps;
        } else if (path === '/settings') {
            steps = settingsPageSteps;
        } else if (path === '/dashboard') {
            steps = dashboardPageSteps;
        } else if (path === '/logs') {
            steps = logsPageSteps;
        } else if (path === '/bin') {
            steps = binPageSteps;
        } else if (path === '/notes') {
            steps = notesPageSteps;
        }

        if (steps.length === 0) {
            driver({
                showProgress: false,
                steps: [{
                    element: '#main-header',
                    popover: {
                        title: 'No Tutorial Available',
                        description: 'There is no specific tour for this page.'
                    }
                }]
            }).drive();
            return;
        }

        const driverObj = driver({
          showProgress: true,
          steps,
          onCloseClick: () => {
                prompt(() => {
                    driverObj.destroy();
                });
            },
        });

        driverObj.drive(initialStep);
    }

    return { startTutorial };
}
