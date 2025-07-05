
'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Task, UiConfig, Person, FieldConfig } from './types';

// --- TEXT GENERATION ---
const generateSingleTaskText = (task: Task, uiConfig: UiConfig, developers: Person[], testers: Person[]): string => {
    let content = '';
    const developersById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]));
    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
    
    content += `*${fieldLabels.get('title') || 'Task'}:* ${task.title}\n`;
    content += `*${fieldLabels.get('status') || 'Status'}:* ${task.status}\n\n`;

    if (task.description) {
      content += `*Description:*\n${task.description}\n\n`;
    }

    const assignedDevelopers = (task.developers || []).map(id => developersById.get(id)).filter(Boolean).join(', ');
    if (assignedDevelopers) content += `*${fieldLabels.get('developers') || 'Developers'}:* ${assignedDevelopers}\n`;

    const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter(Boolean).join(', ');
    if (assignedTesters) content += `*${fieldLabels.get('testers') || 'Testers'}:* ${assignedTesters}\n`;

    const assignedRepos = (task.repositories || []).join(', ');
    if (assignedRepos) content += `*${fieldLabels.get('repositories') || 'Repositories'}:* ${assignedRepos}\n`;

    if (task.azureWorkItemId) {
        const azureFieldConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
        const azureBaseUrl = azureFieldConfig?.baseUrl || '';
        content += `*${fieldLabels.get('azureWorkItemId') || 'Azure ID'}:* ${azureBaseUrl}${task.azureWorkItemId}\n`;
    }

    content += '\n';
    
    // PR Links
    if (task.prLinks && Object.values(task.prLinks).some(v => v && Object.keys(v).length > 0)) {
        content += '*Pull Requests:*\n';
        Object.entries(task.prLinks).forEach(([env, repos]) => {
            if (repos && Object.keys(repos).length > 0) {
                Object.entries(repos).forEach(([repoName, prIds]) => {
                    if (prIds) {
                        const prConfig = uiConfig.repositoryConfigs.find(rc => rc.name === repoName);
                        prIds.split(',').map(id => id.trim()).filter(Boolean).forEach(prId => {
                            content += `- ${repoName} #${prId} (${env}): ${prConfig?.baseUrl || ''}${prId}\n`;
                        });
                    }
                });
            }
        });
        content += '\n';
    }

    // Attachments
    if (task.attachments && task.attachments.length > 0) {
        content += '*Attachments:*\n';
        task.attachments.forEach(att => {
            content += `- ${att.name}: ${att.url}\n`;
        });
        content += '\n';
    }


    return content.trim();
};

export const generateTasksText = (tasks: Task[], uiConfig: UiConfig, developers: Person[], testers: Person[]): string => {
    if (tasks.length === 1) {
        return generateSingleTaskText(tasks[0], uiConfig, developers, testers);
    }
    
    let content = `*Task Summary (${tasks.length} tasks)*\n\n`;
    content += "====================\n\n";

    tasks.forEach((task, index) => {
        content += `${index + 1}. *${task.title}* (${task.status})\n`;
        const assignedDevelopers = (task.developers || []).map(id => developers.find(d => d.id === id)?.name).filter(Boolean).join(', ');
        if (assignedDevelopers) content += `  - Devs: ${assignedDevelopers}\n`;
        if (task.description) content += `  - Desc: ${task.description.substring(0, 100).trim()}...\n`;
        content += "\n";
    });

    return content.trim();
};

// --- PDF GENERATION ---

// Constants for PDF styling
const PADDING = 15;
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_H1 = 16;
const FONT_SIZE_H2 = 12;
const MAX_WIDTH = 210 - PADDING * 2;
const CARD_PADDING = 5;
const CARD_BORDER_RADIUS = 3;
const LINE_HEIGHT = 5;
const LINK_COLOR = '#0b57d0';

const COLORS = {
    TEXT_PRIMARY: '#1f2937', // gray-800
    TEXT_MUTED: '#6b7280',   // gray-500
    CARD_BG: '#ffffff',
    CARD_BORDER: '#e5e7eb', // gray-200
};

const STATUS_COLORS: Record<string, { bg: string, text: string }> = {
    'To Do': { bg: '#f3f4f6', text: '#1f2937' }, // gray-100, gray-800
    'In Progress': { bg: '#dbeafe', text: '#1e40af' }, // blue-100, blue-800
    'Code Review': { bg: '#ede9fe', text: '#5b21b6' },// violet-100, violet-800
    'QA': { bg: '#fef3c7', text: '#b45309' }, // amber-100, amber-800
    'Hold': { bg: '#e5e7eb', text: '#1f2937' }, // gray-200, gray-800
    'Done': { bg: '#d1fae5', text: '#065f46' }, // green-100, green-800
};

const renderCustomFieldValue = (fieldConfig: FieldConfig, value: any) => {
  if (!value) return 'N/A';
  switch (fieldConfig.type) {
    case 'text':
      if (fieldConfig.baseUrl && value) {
        return { text: value, link: `${fieldConfig.baseUrl}${value}` };
      }
      return String(value);
    case 'date':
      return value ? format(new Date(value), 'PPP') : 'Not set';
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'url':
      return { text: value, link: value };
    case 'multiselect':
    case 'tags':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
};

export const generateTaskPdf = (task: Task, uiConfig: UiConfig, developers: Person[], testers: Person[], outputType: 'save' | 'blob' = 'save'): Blob | void => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = PADDING;

    const developersById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]));
    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));

    const checkPageBreak = (neededHeight = 0) => {
        if (y + neededHeight > 297 - PADDING) { // A4 height is 297mm
            doc.addPage();
            y = PADDING;
        }
    };
    
    const drawCard = (title: string, contentDrawer: () => void, cardX = PADDING, cardWidth = MAX_WIDTH) => {
        const startY = y;
        y += 12; // Space for title

        const contentStartY = y;
        contentDrawer();
        const contentHeight = y - contentStartY;

        const cardHeight = contentHeight + CARD_PADDING * 2 + 12; // Add title space
        checkPageBreak(cardHeight);

        doc.setFillColor(COLORS.CARD_BG);
        doc.setDrawColor(COLORS.CARD_BORDER);
        doc.roundedRect(cardX, startY, cardWidth, cardHeight, CARD_BORDER_RADIUS, CARD_BORDER_RADIUS, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_H2);
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        doc.text(title, cardX + CARD_PADDING, startY + 10);
        
        const finalContentY = startY + 12 + CARD_PADDING;
        contentDrawer(finalContentY); // Redraw content at correct position
        y = startY + cardHeight + 5; // Set y for next element
    }
    
    const drawKeyValue = (key: string, value: string | { text: string; link: string } | null | undefined, currentY: number, keyWidth = 40): number => {
        if (!value) return currentY;
        
        checkPageBreak(LINE_HEIGHT);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(COLORS.TEXT_MUTED);
        doc.text(`${key}:`, PADDING + CARD_PADDING, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.TEXT_PRIMARY);

        const valueX = PADDING + CARD_PADDING + keyWidth;
        const availableWidth = MAX_WIDTH - (valueX - PADDING) - CARD_PADDING;
        
        let textToDraw: string;
        let url: string | undefined = undefined;

        if (typeof value === 'object' && value.link) {
            textToDraw = value.text;
            url = value.link;
        } else {
            textToDraw = String(value);
        }

        const lines = doc.splitTextToSize(textToDraw, availableWidth);
        
        if (url) {
            doc.setTextColor(LINK_COLOR);
            doc.textWithLink(textToDraw, valueX, currentY, { url });
            doc.setTextColor(COLORS.TEXT_PRIMARY);
        } else {
            doc.text(lines, valueX, currentY);
        }
        
        return currentY + (lines.length * LINE_HEIGHT) + 2;
    };
    
    const drawStatusBadge = (status: string, x: number, y: number): number => {
        const colors = STATUS_COLORS[status] || STATUS_COLORS['To Do'];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_SMALL);
        const textWidth = doc.getTextWidth(status);
        const badgeWidth = textWidth + 8;
        const badgeHeight = 7;

        doc.setFillColor(colors.bg);
        doc.roundedRect(x, y - (badgeHeight/2) + 1, badgeWidth, badgeHeight, 3, 3, 'F');

        doc.setTextColor(colors.text);
        doc.text(status, x + 4, y);
        
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        return x + badgeWidth;
    };
    
    // --- START PDF DRAWING ---
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SIZE_H1);
    doc.setTextColor(COLORS.TEXT_PRIMARY);
    const titleLines = doc.splitTextToSize(task.title, MAX_WIDTH - 40); // Leave space for badge
    doc.text(titleLines, PADDING, y);
    y += titleLines.length * (LINE_HEIGHT + 1);

    drawStatusBadge(task.status, PADDING, y);
    y += 10;
    
    // Description Card
    if (task.description) {
      drawCard("Description", (startY = y) => {
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        const descLines = doc.splitTextToSize(task.description, MAX_WIDTH - (CARD_PADDING * 2));
        doc.text(descLines, PADDING + CARD_PADDING, startY);
        y = startY + descLines.length * LINE_HEIGHT;
      });
    }

    // Task Details Card
    drawCard("Task Details", (startY = y) => {
        let currentY = startY;
        const assignedDevelopers = (task.developers || []).map(id => developersById.get(id)?.name).filter(Boolean);
        const assignedTesters = (task.testers || []).map(id => testersById.get(id)?.name).filter(Boolean);

        if (assignedDevelopers.length > 0) currentY = drawKeyValue(fieldLabels.get('developers') || 'Developers', assignedDevelopers.join(', '), currentY);
        if (assignedTesters.length > 0) currentY = drawKeyValue(fieldLabels.get('testers') || 'Testers', assignedTesters.join(', '), currentY);
        if (task.repositories && task.repositories.length > 0) currentY = drawKeyValue(fieldLabels.get('repositories') || 'Repositories', task.repositories.join(', '), currentY);
        if (task.azureWorkItemId) {
            const azureConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
            const url = azureConfig?.baseUrl ? `${azureConfig.baseUrl}${task.azureWorkItemId}` : '';
            currentY = drawKeyValue(fieldLabels.get('azureWorkItemId') || 'Azure ID', {text: `#${task.azureWorkItemId}`, link: url}, currentY);
        }
    });

    // Custom Fields Card
    const customFields = uiConfig.fields.filter(f => f.isCustom && f.isActive && task.customFields && task.customFields[f.key]);
    if (customFields.length > 0) {
        drawCard("Custom Fields", (startY = y) => {
            let currentY = startY;
            customFields.forEach(field => {
                const value = task.customFields![field.key];
                const displayValue = renderCustomFieldValue(field, value);
                currentY = drawKeyValue(field.label, displayValue, currentY);
            });
        });
    }

    // Deployments and Dates Card
    const hasDeployments = uiConfig.environments.some(env => task.deploymentStatus?.[env]);
    const hasDates = task.devStartDate || task.devEndDate || task.qaStartDate || task.qaEndDate;
    if (hasDeployments || hasDates) {
        drawCard("Timelines & Deployments", (startY = y) => {
            let currentY = startY;
            if(task.devStartDate) currentY = drawKeyValue(fieldLabels.get('devStartDate'), format(new Date(task.devStartDate), 'PPP'), currentY);
            if(task.devEndDate) currentY = drawKeyValue(fieldLabels.get('devEndDate'), format(new Date(task.devEndDate), 'PPP'), currentY);
            if(task.qaStartDate) currentY = drawKeyValue(fieldLabels.get('qaStartDate'), format(new Date(task.qaStartDate), 'PPP'), currentY);
            if(task.qaEndDate) currentY = drawKeyValue(fieldLabels.get('qaEndDate'), format(new Date(task.qaEndDate), 'PPP'), currentY);
            
            if (hasDeployments) {
                 uiConfig.environments.forEach(env => {
                    const isSelected = task.deploymentStatus?.[env] ?? false;
                    const hasDate = task.deploymentDates && task.deploymentDates[env];
                    const isDeployed = isSelected && (env === 'dev' || !!hasDate);
                    const deploymentDate = hasDate ? format(new Date(hasDate), 'PPP') : '';
                    currentY = drawKeyValue(`${env.charAt(0).toUpperCase() + env.slice(1)} Deployed`, `${isDeployed ? 'Yes' : 'No'} ${deploymentDate ? `(${deploymentDate})` : ''}`, currentY);
                 });
            }
        });
    }

    // Pull Requests Card
    const hasPrs = task.prLinks && Object.values(task.prLinks).some(v => v && Object.keys(v).length > 0);
    if (hasPrs) {
        drawCard("Pull Requests", (startY = y) => {
            let currentY = startY;
            Object.entries(task.prLinks!).forEach(([env, repos]) => {
                if (!repos) return;
                Object.entries(repos).forEach(([repo, ids]) => {
                    if (!ids) return;
                    const prConfig = uiConfig.repositoryConfigs.find(rc => rc.name === repo);
                    ids.split(',').map(id => id.trim()).filter(Boolean).forEach(prId => {
                        const url = prConfig?.baseUrl ? `${prConfig.baseUrl}${prId}` : '#';
                        currentY = drawKeyValue(`${repo} #${prId} (${env})`, { text: url, link: url }, currentY, 50);
                    });
                });
            });
        });
    }
    
    // Attachments Card
    if (task.attachments && task.attachments.length > 0) {
        drawCard("Attachments", (startY = y) => {
            let currentY = startY;
            task.attachments?.forEach(att => {
                currentY = drawKeyValue(att.name, {text: att.url, link: att.url}, currentY, 50);
            });
        });
    }
    // --- END PDF DRAWING ---
    
    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(`Task-${task.id.substring(0, 8)}.pdf`);
    }
};

    