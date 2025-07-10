
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

    const homePageSteps: DriveStep[] = [
        { 
            element: '#main-header', 
            popover: { 
                title: `Welcome to the Main Page!`,
                description: 'This is your central hub for managing tasks. This tour will guide you through the features on this page.' 
            } 
        },
        {
            element: '#new-task-btn',
            popover: {
                title: 'Create a Task',
                description: 'Click here to start a new task. The form allows you to add all necessary details.'
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
            element: '.relative.mb-3.text-sm.text-muted-foreground',
            popover: {
                title: 'AI-Powered Summaries',
                description: 'For longer descriptions, the system automatically generates a concise one-sentence summary to help you quickly grasp the task\'s objective.'
            }
        },
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
            element: '[aria-label="Set Reminder"]',
            popover: {
                title: 'Set a Reminder',
                description: 'Click here to add a reminder note to this task. You can also pin it to the main page for visibility.'
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
             element: 'button:contains("Add Field")',
             popover: {
                title: 'Add Custom Fields',
                description: 'Click here to create your own custom fields to tailor the application to your specific needs (e.g., text, date, select, etc.).'
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
            element: '.relative.w-full.max-w-sm',
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
                title: 'The Bin',
                description: 'Deleted tasks are held here for 30 days, allowing you to restore them anytime.'
            }
        }
    ];

    const startTutorial = () => {
        const config = getUiConfig();
        let steps: DriveStep[] = [];
        
        if (pathname === '/') {
            steps = homePageSteps;
        } else if (pathname.startsWith('/tasks/new')) {
             steps = [{
                element: '#task-form-main-card',
                popover: { title: 'Task Details', description: 'Fill in core details like title, description, status, and assignees.' }
            }];
        } else if (pathname.match(/\/tasks\/[a-zA-Z0-9-]+/)) {
            steps = taskDetailPageSteps;
        } else if (pathname === '/settings') {
            steps = settingsPageSteps;
        } else if (pathname === '/dashboard') {
            steps = dashboardPageSteps;
        } else if (pathname === '/logs') {
            steps = logsPageSteps;
        } else if (pathname === '/bin') {
            steps = binPageSteps;
        }

        if (steps.length === 0) {
            driver({
                showProgress: false,
                steps: [{
                    element: '#main-header',
                    popover: {
                        title: 'No Tour Available',
                        description: 'There is no specific tour for this page.'
                    }
                }]
            }).drive();
            return;
        }

        const driverObj = driver({
          showProgress: true,
          steps: steps.map(step => ({
              ...step,
              popover: {
                  ...step.popover,
                  title: `Welcome to ${config.appName || 'My Task Manager'}!`
              }
          })),
          onCloseClick: () => {
                prompt(() => {
                    driverObj.destroy();
                });
            },
           onNextClick: (element, step, { next, steps }) => {
                if (step.popover?.title?.includes("Create a Task")) {
                    prompt(() => router.push('/tasks/new'));
                }
                next();
            },
        });

        driverObj.drive();
    }

    return { startTutorial };
}
