
'use client';

import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useRouter, usePathname } from "next/navigation";
import { useUnsavedChanges } from "./use-unsaved-changes";

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
                title: 'Task Manager Tutorial',
                description: 'Easily find any task by using the search bar or filtering by status, repository, or deployment.'
            }
        },
        {
            element: '#view-mode-toggle',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'You can switch between a visual Grid view and a detailed Table view to suit your workflow.'
            }
        },
        {
            element: '.relative.mb-3.text-sm.text-muted-foreground',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'For longer descriptions, the system automatically generates a concise one-sentence summary to help you quickly grasp the task\'s objective.'
            }
        },
         {
            element: '#new-task-btn',
            popover: {
                title: 'Task Manager Tutorial',
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
                title: 'Task Manager Tutorial',
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
                title: 'Task Manager Tutorial',
                description: 'Once you\'re done, click here to create the task and return to the main list.'
            }
        }
    ];

    const taskDetailPageSteps: DriveStep[] = [
        {
            element: '.group\\/card',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'This is the main view for a single task, showing its title, description, and current status.'
            },
        },
        {
            element: 'button.h-8.w-8[aria-label="Set Reminder"]',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'Click the bell icon to add a reminder note to this task. You can also pin it to the main page for visibility.'
            }
        },
    ];

    const settingsPageSteps: DriveStep[] = [
        {
            element: '#settings-field-config-card',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'Here you can edit, reorder, and manage all the fields that appear on your tasks.'
            }
        },
        {
             element: '#add-field-button',
             popover: {
                title: 'Task Manager Tutorial',
                description: 'Click here to create your own custom fields to tailor the application to your specific needs (e.g., text, date, select, etc.).'
             }
        },
        {
            element: '#settings-people-management',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'Add and manage your lists of developers and testers in these sections.'
            }
        },
        {
            element: '#settings-environment-card',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'Define your deployment environments beyond the standard dev, stage, and production.'
            }
        },
    ];

    const dashboardPageSteps: DriveStep[] = [
        {
            element: '.grid.grid-cols-1.lg\\:grid-cols-2.gap-8',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'This dashboard provides a high-level overview of your team\'s progress with visual charts tracking tasks by status, assignees, and deployments.'
            }
        }
    ];

    const logsPageSteps: DriveStep[] = [
        {
            element: '.relative.w-full.max-w-sm',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'Here you can view a complete, filterable audit trail of every change made to tasks and settings.'
            }
        }
    ];

    const binPageSteps: DriveStep[] = [
        {
            element: '.border.rounded-lg.overflow-x-auto',
            popover: {
                title: 'Task Manager Tutorial',
                description: 'Deleted tasks are held here for 30 days, allowing you to restore them anytime.'
            }
        }
    ];

    const startTutorial = () => {
        startTutorialForPage(pathname);
    };

    const startTutorialForPage = (path: string, initialStep: number = 0) => {
        let steps: DriveStep[] = [];
        
        if (path === '/') {
            steps = homePageSteps;
        } else if (path.startsWith('/tasks/new')) {
             steps = newTaskPageSteps;
        } else if (path.match(/\/tasks\/[a-zA-Z0-9-]+/)) {
            steps = taskDetailPageSteps;
        } else if (path === '/settings') {
            steps = settingsPageSteps;
        } else if (path === '/dashboard') {
            steps = dashboardPageSteps;
        } else if (path === '/logs') {
            steps = logsPageSteps;
        } else if (path === '/bin') {
            steps = binPageSteps;
        }

        if (steps.length === 0) {
            driver({
                showProgress: false,
                steps: [{
                    element: '#main-header',
                    popover: {
                        title: 'Task Manager Tutorial',
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
