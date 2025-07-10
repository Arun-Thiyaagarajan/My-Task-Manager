
'use client';

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "./use-unsaved-changes";

export function useTutorial() {
    const router = useRouter();
    const { prompt } = useUnsavedChanges();

    const startTutorial = (appName: string) => {
        const driverObj = driver({
          showProgress: true,
          steps: [
            { 
                element: '#main-header', 
                popover: { 
                    title: `Welcome to ${appName}!`,
                    description: 'This quick tour will guide you through the main features of the application. Let\'s get started!' 
                } 
            },
            {
                element: '#new-task-btn',
                popover: {
                    title: 'Create a Task',
                    description: 'This is where you can start a new task. The form allows you to add all necessary details.'
                },
                onNextClick: () => {
                    prompt(() => {
                        router.push('/tasks/new');
                        setTimeout(() => driverObj.moveNext(), 500);
                    });
                }
            },
            {
                element: '#task-form-main-card',
                popover: {
                    title: 'Task Details',
                    description: 'Fill in the core details like title, description, and status here. You can also assign developers, testers, and repositories.'
                }
            },
            {
                element: '#task-form-submit',
                popover: {
                    title: 'Save Your Task',
                    description: 'Once you\'re done, click here to create the task and return to the main task board.'
                },
                onNextClick: () => {
                    prompt(() => {
                        router.push('/');
                        setTimeout(() => driverObj.moveNext(), 500);
                    });
                }
            },
            {
                element: '#task-filters',
                popover: {
                    title: 'Filtering and Searching',
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
                element: '#header-nav-settings',
                popover: {
                    title: 'Application Settings',
                    description: 'Let\'s explore the settings page where you can customize the application.'
                },
                onNextClick: () => {
                    prompt(() => {
                        router.push('/settings');
                        setTimeout(() => driverObj.moveNext(), 500);
                    });
                }
            },
            {
                element: '#settings-field-config-card',
                popover: {
                    title: 'Field Configuration',
                    description: 'Here you can add, edit, reorder, and manage all the fields that appear on your tasks.'
                }
            },
            {
                element: '#settings-people-management',
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
                element: '#header-nav-dashboard',
                popover: {
                    title: 'Dashboard',
                    description: 'Get a high-level overview of your team\'s progress with visual charts.'
                },
                 onNextClick: () => {
                    prompt(() => {
                        router.push('/dashboard');
                        setTimeout(() => driverObj.moveNext(), 500);
                    });
                }
            },
            {
                element: '#header-nav-logs',
                popover: {
                    title: 'Activity Logs',
                    description: 'View a complete, filterable audit trail of every change made to tasks and settings.'
                },
                 onNextClick: () => {
                    prompt(() => {
                        router.push('/logs');
                        setTimeout(() => driverObj.moveNext(), 500);
                    });
                }
            },
            {
                element: '#header-nav-bin',
                popover: {
                    title: 'The Bin',
                    description: 'Deleted tasks are held here for 30 days, allowing you to restore them anytime.'
                },
                 onNextClick: () => {
                    prompt(() => {
                        router.push('/bin');
                        setTimeout(() => driverObj.moveNext(), 500);
                    });
                }
            },
            {
                element: '#main-header',
                popover: {
                    title: 'Tour Complete!',
                    description: 'You\'ve learned the basics. You can restart this tour anytime from the header. Happy tasking!',
                     onNextClick: () => {
                        prompt(() => {
                            router.push('/');
                            driverObj.destroy();
                        });
                    }
                }
            }
          ]
        });

        driverObj.drive();
    }

    return { startTutorial };
}
