
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

export const generateTaskPdf = (task: Task, uiConfig: UiConfig, developers: Person[], testers: Person[], outputType: 'save' | 'blob' = 'save'): Blob | void => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 15;

    // --- HELPERS ---
    const PADDING = 15;
    const MAX_WIDTH = doc.internal.pageSize.getWidth() - PADDING * 2;
    const FONT_SIZE_NORMAL = 10;
    const FONT_SIZE_SMALL = 8;
    const FONT_SIZE_H1 = 16;
    const FONT_SIZE_H2 = 12;
    const LINE_HEIGHT = 5.5;
    const LINK_COLOR = '#0b57d0';

    const COLORS = {
        TEXT_PRIMARY: '#1f2937',
        TEXT_MUTED: '#6b7280',
        CARD_BORDER: '#e5e7eb',
    };

    const STATUS_COLORS: Record<string, { bg: string, text: string }> = {
        'To Do': { bg: '#f3f4f6', text: '#1f2937' },
        'In Progress': { bg: '#dbeafe', text: '#1e40af' },
        'Code Review': { bg: '#ede9fe', text: '#5b21b6' },
        'QA': { bg: '#fef3c7', text: '#b45309' },
        'Hold': { bg: '#e5e7eb', text: '#1f2937' },
        'Done': { bg: '#d1fae5', text: '#065f46' },
    };

    const checkPageBreak = (neededHeight = 0) => {
        if (y + neededHeight > doc.internal.pageSize.getHeight() - PADDING) {
            doc.addPage();
            y = PADDING;
        }
    };

    const drawTitle = (text: string) => {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_H1);
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        const lines = doc.splitTextToSize(text, MAX_WIDTH - 45); // Space for badge
        doc.text(lines, PADDING, y);
        y += (lines.length * (LINE_HEIGHT + 2));
    };

    const drawStatusBadge = (status: string) => {
        const colors = STATUS_COLORS[status] || STATUS_COLORS['To Do'];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_NORMAL);
        const textWidth = doc.getTextWidth(status);
        const badgeWidth = textWidth + 8;
        const badgeHeight = 8;
        
        const badgeX = doc.internal.pageSize.getWidth() - PADDING - badgeWidth;
        const badgeY = 15;

        doc.setFillColor(colors.bg);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'F');
        doc.setTextColor(colors.text);
        doc.text(status, badgeX + 4, badgeY + badgeHeight / 2 + 1.5, { baseline: 'middle' });
    };

    const drawSectionHeader = (title: string) => {
        checkPageBreak(15);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_H2);
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        doc.text(title, PADDING, y);
        y += LINE_HEIGHT;
        doc.setDrawColor(COLORS.CARD_BORDER);
        doc.line(PADDING, y, PADDING + MAX_WIDTH, y);
        y += 5;
    };

    const drawKeyValue = (key: string, value: string | { text: string; link: string } | null | undefined, indent = 0) => {
        if (!value) return;
        
        const keyX = PADDING + indent;
        const valueX = keyX + 40;
        const valueWidth = MAX_WIDTH - 45 - indent;
        
        let text: string, link: string | undefined;
        if (typeof value === 'object' && value !== null) {
            text = value.text;
            link = value.link;
        } else {
            text = String(value);
        }

        const lines = doc.splitTextToSize(text, valueWidth);
        checkPageBreak(lines.length * LINE_HEIGHT);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(COLORS.TEXT_MUTED);
        doc.text(`${key}:`, keyX, y, { align: 'left', baseline: 'top' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        
        if (link) {
            doc.setTextColor(LINK_COLOR);
            const linkLines = doc.splitTextToSize(link, valueWidth);
            doc.textWithLink(text, valueX, y, { url: link });
        } else {
            doc.text(lines, valueX, y);
        }
        
        y += lines.length * LINE_HEIGHT + 2;
    };


    // --- DATA PREPARATION ---
    const developersById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]));
    const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
    const customFields = uiConfig.fields.filter(f => f.isCustom && f.isActive && task.customFields && typeof task.customFields[f.key] !== 'undefined' && task.customFields[f.key] !== null && task.customFields[f.key] !== '');

    // --- PDF DRAWING ---
    drawTitle(task.title);
    drawStatusBadge(task.status);
    y -= 5;

    // Description
    if (task.description) {
        drawSectionHeader(fieldLabels.get('description') || 'Description');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(COLORS.TEXT_PRIMARY);
        const lines = doc.splitTextToSize(task.description, MAX_WIDTH);
        checkPageBreak(lines.length * LINE_HEIGHT);
        doc.text(lines, PADDING, y);
        y += lines.length * LINE_HEIGHT;
    }

    // Details Section
    drawSectionHeader('Task Details');
    const assignedDevs = (task.developers || []).map(id => developersById.get(id)).filter(Boolean).join(', ');
    drawKeyValue(fieldLabels.get('developers') || 'Developers', assignedDevs);

    const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter(Boolean).join(', ');
    drawKeyValue(fieldLabels.get('testers') || 'Testers', assignedTesters);
    
    if (task.repositories && task.repositories.length > 0) {
        drawKeyValue(fieldLabels.get('repositories') || 'Repositories', task.repositories.join(', '));
    }
    
    if (task.azureWorkItemId) {
        const azureConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
        const url = azureConfig?.baseUrl ? `${azureConfig.baseUrl}${task.azureWorkItemId}` : '';
        drawKeyValue(fieldLabels.get('azureWorkItemId') || 'Azure ID', { text: `#${task.azureWorkItemId}`, link: url });
    }

    // Custom Fields
    if (customFields.length > 0) {
        drawSectionHeader('Custom Fields');
        customFields.forEach(field => {
            const value = task.customFields![field.key];
            const displayValue = renderCustomFieldValue(field, value);
            drawKeyValue(field.label, displayValue);
        });
    }

    // Timeline and Deployments
    drawSectionHeader('Timeline & Deployments');
    if (task.devStartDate) drawKeyValue(fieldLabels.get('devStartDate'), format(new Date(task.devStartDate), 'PPP'));
    if (task.devEndDate) drawKeyValue(fieldLabels.get('devEndDate'), format(new Date(task.devEndDate), 'PPP'));
    if (task.qaStartDate) drawKeyValue(fieldLabels.get('qaStartDate'), format(new Date(task.qaStartDate), 'PPP'));
    if (task.qaEndDate) drawKeyValue(fieldLabels.get('qaEndDate'), format(new Date(task.qaEndDate), 'PPP'));
    y += 2;
    uiConfig.environments.forEach(env => {
        const isSelected = task.deploymentStatus?.[env] ?? false;
        const hasDate = task.deploymentDates && task.deploymentDates[env];
        const isDeployed = isSelected && (env === 'dev' || !!hasDate);
        if (isDeployed) {
            const deploymentDate = hasDate ? `on ${format(new Date(hasDate), 'PPP')}` : '';
            drawKeyValue(`${env.charAt(0).toUpperCase() + env.slice(1)} Deployed`, `Yes ${deploymentDate}`);
        }
    });

    // PRs
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
                    drawKeyValue(`${repo} #${prId} (${env})`, { text: url, link: url });
                });
            });
        });
    }

    // Attachments
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
    
    // --- FINAL ---
    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(`Task-${task.id.substring(0, 8)}.pdf`);
    }
};
