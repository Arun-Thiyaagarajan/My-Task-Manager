
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

const renderCustomFieldValue = (fieldConfig: FieldConfig, value: any) => {
  if (value === null || value === undefined || value === '') return 'N/A';
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


const _drawTaskOnPage = (
    doc: jsPDF,
    task: Task,
    uiConfig: UiConfig,
    developers: Person[],
    testers: Person[]
) => {
    let y = 15;

    // --- LAYOUT CONSTANTS & HELPERS ---
    const PADDING = 15;
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const MAX_CONTENT_WIDTH = PAGE_WIDTH - PADDING * 2;
    
    const KEY_COLUMN_WIDTH = 45;
    const VALUE_COLUMN_X = PADDING + KEY_COLUMN_WIDTH;
    const VALUE_COLUMN_WIDTH = MAX_CONTENT_WIDTH - KEY_COLUMN_WIDTH;

    const FONT_SIZE_NORMAL = 10;
    const FONT_SIZE_H1 = 16;
    const FONT_SIZE_H2 = 12;
    const LINE_HEIGHT_NORMAL = 5.5;

    const COLORS = {
        TEXT_PRIMARY: [31, 41, 55],
        TEXT_MUTED: [107, 114, 128],
        CARD_BORDER: [229, 231, 235],
        LINK: [11, 87, 208],
    };

    const STATUS_COLORS: Record<string, { bg: [number, number, number], text: [number, number, number] }> = {
        'To Do': { bg: [243, 244, 246], text: [31, 41, 55] },
        'In Progress': { bg: [219, 234, 254], text: [30, 64, 175] },
        'Code Review': { bg: [237, 233, 254], text: [91, 33, 182] },
        'QA': { bg: [254, 243, 199], text: [180, 83, 9] },
        'Hold': { bg: [229, 231, 235], text: [31, 41, 55] },
        'Done': { bg: [209, 250, 229], text: [6, 95, 70] },
    };

    const checkPageBreak = (neededHeight = 0) => {
        if (y + neededHeight > PAGE_HEIGHT - PADDING) {
            doc.addPage();
            y = PADDING;
        }
    };
    
    doc.setFont('helvetica', 'normal');

    const drawTitle = (text: string, status: string) => {
        const statusColors = STATUS_COLORS[status] || STATUS_COLORS['To Do'];
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setFont('helvetica', 'bold');
        const statusTextWidth = doc.getTextWidth(status);
        const badgeWidth = statusTextWidth + 8;
        
        const titleWidth = MAX_CONTENT_WIDTH - badgeWidth - 10;
        
        doc.setFontSize(FONT_SIZE_H1);
        const titleLines = doc.splitTextToSize(text, titleWidth);
        const titleHeight = titleLines.length * (LINE_HEIGHT_NORMAL * 1.2);
        
        checkPageBreak(titleHeight + 4);
        
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(titleLines, PADDING, y, { baseline: 'top' });

        const badgeHeight = 8;
        const badgeY = y + (titleHeight / 2) - (badgeHeight / 2);
        const badgeX = PAGE_WIDTH - PADDING - badgeWidth;
        
        doc.setFillColor(statusColors.bg[0], statusColors.bg[1], statusColors.bg[2]);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'F');
        
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(statusColors.text[0], statusColors.text[1], statusColors.text[2]);
        doc.text(status, badgeX + 4, badgeY + badgeHeight / 2, { baseline: 'middle' });

        y += titleHeight + 4;
    };

    const drawSectionHeader = (title: string) => {
        checkPageBreak(15);
        y += 7;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_H2);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(title, PADDING, y);
        y += LINE_HEIGHT_NORMAL - 1;
        doc.setDrawColor(COLORS.CARD_BORDER[0], COLORS.CARD_BORDER[1], COLORS.CARD_BORDER[2]);
        doc.line(PADDING, y, PADDING + MAX_CONTENT_WIDTH, y);
        y += 5;
    };

    const drawKeyValue = (key: string, value: string | { text: string; link: string } | null | undefined) => {
        if (!value) return;

        let textValue: string, linkUrl: string | undefined;
        if (typeof value === 'object' && value !== null) {
            textValue = value.text;
            linkUrl = value.link;
        } else {
            textValue = String(value);
        }
        
        doc.setFontSize(FONT_SIZE_NORMAL);
        
        const keyLines = doc.splitTextToSize(`${key}:`, KEY_COLUMN_WIDTH - 2);
        const valueLines = doc.splitTextToSize(textValue, VALUE_COLUMN_WIDTH);
        
        const requiredHeight = Math.max(keyLines.length, valueLines.length) * LINE_HEIGHT_NORMAL;
        checkPageBreak(requiredHeight + 2);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.TEXT_MUTED[0], COLORS.TEXT_MUTED[1], COLORS.TEXT_MUTED[2]);
        doc.text(keyLines, PADDING, y, { baseline: 'top' });

        doc.setFont('helvetica', 'normal');
        if (linkUrl) {
            doc.setTextColor(COLORS.LINK[0], COLORS.LINK[1], COLORS.LINK[2]);
            doc.text(valueLines, VALUE_COLUMN_X, y, { baseline: 'top' });
            doc.link(VALUE_COLUMN_X, y, VALUE_COLUMN_WIDTH, requiredHeight, { url: linkUrl });
        } else {
            doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
            doc.text(valueLines, VALUE_COLUMN_X, y, { baseline: 'top' });
        }
        
        y += requiredHeight + 2;
    };

    // --- DATA PREPARATION ---
    const developersById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]));
    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
    const customFields = uiConfig.fields.filter(f => f.isCustom && f.isActive && task.customFields && typeof task.customFields[f.key] !== 'undefined' && task.customFields[f.key] !== null && task.customFields[f.key] !== '');

    // --- PDF DRAWING ---
    drawTitle(task.title, task.status);
    
    if (task.description) {
        drawSectionHeader(fieldLabels.get('description') || 'Description');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        const lines = doc.splitTextToSize(task.description, MAX_CONTENT_WIDTH);
        checkPageBreak(lines.length * LINE_HEIGHT_NORMAL);
        doc.text(lines, PADDING, y);
        y += (lines.length * LINE_HEIGHT_NORMAL) + 2;
    }

    drawSectionHeader('Task Details');
    const assignedDevs = (task.developers || []).map(id => developersById.get(id)).filter(Boolean).join(', ');
    drawKeyValue(fieldLabels.get('developers') || 'Developers', assignedDevs);
    const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter(Boolean).join(', ');
    drawKeyValue(fieldLabels.get('testers') || 'QA', assignedTesters);
    if (task.repositories && task.repositories.length > 0) {
        drawKeyValue(fieldLabels.get('repositories') || 'Repositories', task.repositories.join(', '));
    }
    if (task.azureWorkItemId) {
        const azureConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
        const url = azureConfig?.baseUrl ? `${azureConfig.baseUrl}${task.azureWorkItemId}` : '';
        drawKeyValue(fieldLabels.get('azureWorkItemId') || 'Azure Work Item ID', { text: `#${task.azureWorkItemId}`, link: url });
    }

    if (customFields.length > 0) {
        drawSectionHeader('Custom Fields');
        customFields.forEach(field => {
            const value = task.customFields![field.key];
            const displayValue = renderCustomFieldValue(field, value);
            drawKeyValue(field.label, displayValue);
        });
    }

    drawSectionHeader('Timeline & Deployments');
    if (task.devStartDate) drawKeyValue(fieldLabels.get('devStartDate') || 'Dev Start Date', format(new Date(task.devStartDate), 'PPP'));
    if (task.devEndDate) drawKeyValue(fieldLabels.get('devEndDate') || 'Dev End Date', format(new Date(task.devEndDate), 'PPP'));
    if (task.qaStartDate) drawKeyValue(fieldLabels.get('qaStartDate') || 'QA Start Date', format(new Date(task.qaStartDate), 'PPP'));
    if (task.qaEndDate) drawKeyValue(fieldLabels.get('qaEndDate') || 'QA End Date', format(new Date(task.qaEndDate), 'PPP'));
    
    if (uiConfig.environments.length > 0) {
      if (task.devStartDate || task.devEndDate || task.qaStartDate || task.qaEndDate) y += 2; // Add spacing
      uiConfig.environments.forEach(env => {
          const isSelected = task.deploymentStatus?.[env] ?? false;
          const hasDate = task.deploymentDates && task.deploymentDates[env];
          const isDeployed = isSelected && (env === 'dev' || !!hasDate);
          if (isDeployed) {
              const deploymentDate = hasDate ? `on ${format(new Date(hasDate), 'PPP')}` : '(Deployed)';
              drawKeyValue(`${env.charAt(0).toUpperCase() + env.slice(1)} Deployed`, deploymentDate);
          }
      });
    }

    const hasPrs = task.prLinks && Object.values(task.prLinks).some(v => v && Object.keys(v).length > 0);
    if(hasPrs) {
        drawSectionHeader('Pull Requests');
        Object.entries(task.prLinks!).forEach(([env, repos]) => {
            if (!repos) return;
            Object.entries(repos).forEach(([repo, ids]) => {
                if (!ids) return;
                const prConfig = uiConfig.repositoryConfigs.find(rc => rc.name === repo);
                ids.split(',').map(id => id.trim()).filter(Boolean).forEach(prId => {
                    const url = prConfig?.baseUrl ? `${prConfig.baseUrl}${prId}` : '#';
                    const key = `${repo} #${prId} (${env})`;
                    drawKeyValue(key, { text: url, link: url });
                });
            });
        });
    }

    if (task.attachments && task.attachments.length > 0) {
        drawSectionHeader('Attachments');
        task.attachments.forEach(att => {
            if (att.type === 'link') {
              drawKeyValue(att.name, {text: att.url, link: att.url});
            } else {
              drawKeyValue(att.name, '(Image Attachment - not shown in PDF)');
            }
        });
    }
};

export const generateTaskPdf = (
    task: Task, 
    uiConfig: UiConfig, 
    developers: Person[], 
    testers: Person[], 
    outputType: 'save' | 'blob' = 'save',
    filename?: string
): Blob | void => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    _drawTaskOnPage(doc, task, uiConfig, developers, testers);
    
    const sanitizeFilename = (name: string): string => {
        return name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
    };
    const finalFilename = filename || `${sanitizeFilename(task.title)}.pdf`;
    
    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(finalFilename);
    }
};

export const generateMultipleTasksPdf = (
    tasks: Task[], 
    uiConfig: UiConfig, 
    developers: Person[], 
    testers: Person[], 
    outputType: 'save' | 'blob' = 'save'
): Blob | void => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    
    tasks.forEach((task, index) => {
        if (index > 0) {
            doc.addPage();
        }
        _drawTaskOnPage(doc, task, uiConfig, developers, testers);
    });

    const filename = 'My Tasks.pdf';
    
    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(filename);
    }
};
