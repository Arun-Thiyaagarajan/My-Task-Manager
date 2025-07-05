
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
const PADDING = 15;
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_H1 = 18;
const FONT_SIZE_H2 = 14;
const MAX_WIDTH = 210 - PADDING * 2;

const renderCustomFieldValue = (doc: jsPDF, fieldConfig: FieldConfig, value: any) => {
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

    const developersById = new Map(developers.map(d => [d.id, d]));
    const testersById = new Map(testers.map(t => [d.id, t]));
    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
    const checkPageBreak = () => {
        if (y > 270) {
            doc.addPage();
            y = PADDING;
        }
    };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SIZE_H1);
    const titleLines = doc.splitTextToSize(task.title, MAX_WIDTH);
    doc.text(titleLines, PADDING, y);
    y += titleLines.length * 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.setTextColor(150, 150, 150);
    doc.text(`Status: ${task.status} | Last Updated: ${format(new Date(task.updatedAt), 'PPP')}`, PADDING, y);
    y += 10;
    doc.setTextColor(0, 0, 0);

    // Description
    if (task.description) {
        doc.setFontSize(FONT_SIZE_NORMAL);
        const descLines = doc.splitTextToSize(task.description, MAX_WIDTH);
        doc.text(descLines, PADDING, y);
        y += descLines.length * 5 + 10;
    }
    
    checkPageBreak();

    const addSection = (title: string, drawContent: () => void) => {
        checkPageBreak();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_H2);
        doc.text(title, PADDING, y);
        y += 5;
        doc.setLineWidth(0.2);
        doc.line(PADDING, y, MAX_WIDTH + PADDING, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_NORMAL);
        drawContent();
        y += 7;
    };
    
    const addKeyValue = (key: string, value: string | { text: string; link: string } | null | undefined) => {
        if (!value) return;
        checkPageBreak();
        doc.setFont('helvetica', 'bold');
        const keyText = `${key}:`;
        doc.text(keyText, PADDING, y);
        doc.setFont('helvetica', 'normal');
        
        const valueX = PADDING + doc.getTextWidth(keyText) + 3;
        const availableWidth = MAX_WIDTH - (valueX - PADDING);
        
        if (typeof value === 'object' && value.link) {
            doc.setTextColor(47, 83, 206);
            doc.textWithLink(value.text, valueX, y, { url: value.link });
            doc.setTextColor(0, 0, 0);
            y += 7;
        } else {
            const splitValue = doc.splitTextToSize(String(value), availableWidth);
            doc.text(splitValue, valueX, y);
            y += splitValue.length * 5 + 2;
        }
    };
    
    const assignedDevelopers = (task.developers || []).map(id => developersById.get(id)?.name).filter(Boolean);
    const assignedTesters = (task.testers || []).map(id => testersById.get(id)?.name).filter(Boolean);
    const hasAssignments = assignedDevelopers.length > 0 || assignedTesters.length > 0 || (task.repositories && task.repositories.length > 0) || task.azureWorkItemId;

    if (hasAssignments) {
        addSection("Assignment & Tracking", () => {
            if (assignedDevelopers.length > 0) addKeyValue(fieldLabels.get('developers'), assignedDevelopers.join(', '));
            if (assignedTesters.length > 0) addKeyValue(fieldLabels.get('testers'), assignedTesters.join(', '));
            if (task.repositories && task.repositories.length > 0) addKeyValue(fieldLabels.get('repositories'), task.repositories.join(', '));
            if (task.azureWorkItemId) {
                const azureConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
                const url = azureConfig?.baseUrl ? `${azureConfig.baseUrl}${task.azureWorkItemId}` : '';
                addKeyValue(fieldLabels.get('azureWorkItemId') || 'Azure ID', {text: `#${task.azureWorkItemId}`, link: url});
            }
        });
    }

    const customFields = uiConfig.fields.filter(f => f.isCustom && f.isActive && task.customFields && task.customFields[f.key]);
    if (customFields.length > 0) {
        addSection("Custom Fields", () => {
            customFields.forEach(field => {
                const value = task.customFields![field.key];
                const displayValue = renderCustomFieldValue(doc, field, value);
                addKeyValue(field.label, displayValue);
            });
        });
    }

    const hasPrs = task.prLinks && Object.values(task.prLinks).some(v => v && Object.keys(v).length > 0);
    if (hasPrs) {
        addSection("Pull Requests", () => {
            Object.entries(task.prLinks!).forEach(([env, repos]) => {
                if (!repos) return;
                Object.entries(repos).forEach(([repo, ids]) => {
                    if (!ids) return;
                    const prConfig = uiConfig.repositoryConfigs.find(rc => rc.name === repo);
                    ids.split(',').map(id => id.trim()).filter(Boolean).forEach(prId => {
                        const url = prConfig?.baseUrl ? `${prConfig.baseUrl}${prId}` : '#';
                        addKeyValue(`${repo} #${prId} (${env})`, { text: url, link: url });
                    });
                });
            });
        });
    }
    
    const hasAttachments = task.attachments && task.attachments.length > 0;
    if (hasAttachments) {
        addSection("Attachments", () => {
            task.attachments?.forEach(att => {
                addKeyValue(att.name, {text: att.url, link: att.url});
            });
        });
    }

    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(`Task-${task.id.substring(0, 8)}.pdf`);
    }
};
