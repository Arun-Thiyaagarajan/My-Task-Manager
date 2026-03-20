'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Task, UiConfig, Person, FieldConfig, Environment, Comment, Attachment } from './types';

// --- SVG ICONS FOR PDF WATERMARK ---
const STATUS_SVG_ICONS: Record<string, string> = {
  'Done': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  'To Do': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
  'In Progress': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  'Code Review': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>`,
  'QA': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 9 3 7.7 3 6"/><path d="M17.47 9c1.93 0 3.5-1.7 3.5-3"/><path d="M3 13h18"/><path d="M18 13v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2"/></svg>`,
  'Hold': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>`,
};

const svgToDataURL = (svg: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 24;
                canvas.height = 24;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    URL.revokeObjectURL(url);
                    resolve(pngDataUrl);
                } else {
                    URL.revokeObjectURL(url);
                    reject(new Error('Could not get canvas context.'));
                }
            };
            
            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };

            img.src = url;
        } catch(e) {
            reject(e);
        }
    });
};

const isDataURI = (str: string | null | undefined): str is string => !!str && str.startsWith('data:image');

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
        const urlValue = String(value);
        return { text: urlValue, link: urlValue };
    case 'multiselect':
    case 'tags':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
};

const _drawTaskOnPage = async (
    doc: jsPDF,
    task: Task,
    uiConfig: UiConfig,
    developers: Person[],
    testers: Person[]
) => {
    let y = 0;

    // --- LAYOUT CONSTANTS & HELPERS ---
    const PADDING = 15;
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const MAX_CONTENT_WIDTH = PAGE_WIDTH - PADDING * 2;
    
    const KEY_COLUMN_WIDTH = 55;
    const VALUE_COLUMN_X = PADDING + KEY_COLUMN_WIDTH;
    const VALUE_COLUMN_WIDTH = MAX_CONTENT_WIDTH - KEY_COLUMN_WIDTH;

    const FONT_SIZE_NORMAL = 10;
    const FONT_SIZE_H1 = 18;
    const FONT_SIZE_H2 = 13;
    const LINE_HEIGHT_NORMAL = 6;

    const COLORS = {
        TEXT_PRIMARY: [31, 41, 55],
        TEXT_MUTED: [107, 114, 128],
        CARD_BORDER: [229, 231, 235],
        LINK: [11, 87, 208],
        WATERMARK: [240, 240, 240],
    };

    const WATERMARK_COLORS: Record<string, [number, number, number]> = {
        'To Do': [107, 114, 128],
        'In Progress': [59, 130, 246],
        'Code Review': [139, 92, 246],
        'QA': [234, 179, 8],
        'Hold': [113, 113, 122],
        'Done': [34, 197, 94],
    };

    const STATUS_COLORS: Record<string, { bg: [number, number, number], text: [number, number, number] }> = {
        'To Do': { bg: [243, 244, 246], text: [31, 41, 55] },
        'In Progress': { bg: [219, 234, 254], text: [30, 64, 175] },
        'Code Review': { bg: [237, 233, 254], text: [91, 33, 182] },
        'QA': { bg: [254, 243, 199], text: [180, 83, 9] },
        'Hold': { bg: [229, 231, 235], text: [31, 41, 55] },
        'Done': { bg: [209, 250, 229], text: [6, 95, 70] },
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
    }

    const checkPageBreak = (neededHeight = 0) => {
        if (y + neededHeight > PAGE_HEIGHT - PADDING - 15) {
            drawFooter();
            doc.addPage();
            drawHeader();
            drawWatermark();
            y = PADDING + 12;
        }
    };
    
    const drawHeader = () => {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_MUTED);
        doc.setFont('helvetica', 'bold');
        
        let textX = PADDING;
        const iconSize = 8;
        if (uiConfig.appIcon && isDataURI(uiConfig.appIcon)) {
            try {
                const imageProps = doc.getImageProperties(uiConfig.appIcon);
                // Position icon aligned with PADDING top
                doc.addImage(uiConfig.appIcon, imageProps.fileType, PADDING, PADDING - 4, iconSize, iconSize);
                textX += iconSize + 3;
            } catch (e) {}
        }
        
        doc.text(uiConfig.appName || 'TaskFlow Workspace', textX, PADDING, { baseline: 'middle' });
    };

    const drawFooter = () => {
        const footerY = PAGE_HEIGHT - PADDING + 5;
        doc.setDrawColor(...COLORS.CARD_BORDER);
        doc.line(PADDING, footerY - 8, PAGE_WIDTH - PADDING, footerY - 8);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.TEXT_MUTED);
        doc.text(`Generated on ${format(new Date(), 'PPP')}`, PADDING, footerY, { baseline: 'middle' });

        doc.setFont('helvetica', 'normal');
        doc.text(task.title, PAGE_WIDTH - PADDING, footerY, { align: 'right', baseline: 'middle' });
    };
    
    const drawWatermark = async () => {
        const status = task.status;
        const svgString = STATUS_SVG_ICONS[status] || STATUS_SVG_ICONS['To Do'];
        const colorRGB = WATERMARK_COLORS[status] || WATERMARK_COLORS['To Do'];
        
        if (!svgString) return;

        const colorHex = rgbToHex(colorRGB[0], colorRGB[1], colorRGB[2]);
        const coloredSvg = svgString.replace(/currentColor/g, colorHex);

        const iconSize = 140;
        const x = (PAGE_WIDTH - iconSize) / 2;
        const y_pos = (PAGE_HEIGHT - iconSize) / 2;

        try {
            const pngDataUrl = await svgToDataURL(coloredSvg);
            doc.setGState(new doc.GState({ opacity: 0.05 }));
            doc.addImage(pngDataUrl, 'PNG', x, y_pos, iconSize, iconSize);
            doc.setGState(new doc.GState({ opacity: 1 }));
        } catch (e) {
            console.error("Failed to render watermark:", e);
        }
    };

    const drawTitleAndBadge = (text: string, status: string) => {
        const statusColors = STATUS_COLORS[status] || STATUS_COLORS['To Do'];
        doc.setFontSize(FONT_SIZE_H1);
        doc.setFont('helvetica', 'bold');
        
        const titleLines = doc.splitTextToSize(text, MAX_CONTENT_WIDTH - 40);
        const titleHeight = titleLines.length * (LINE_HEIGHT_NORMAL * 1.2);
        
        y = PADDING + 15;
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(titleLines, PADDING, y, { baseline: 'top' });

        // Badge at top right
        doc.setFontSize(9);
        const statusWidth = doc.getTextWidth(status);
        const badgeWidth = statusWidth + 10;
        const badgeHeight = 7;
        const badgeX = PAGE_WIDTH - PADDING - badgeWidth;
        const badgeY = y;

        doc.setFillColor(statusColors.bg[0], statusColors.bg[1], statusColors.bg[2]);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'F');
        
        doc.setTextColor(statusColors.text[0], statusColors.text[1], statusColors.text[2]);
        doc.text(status, badgeX + 5, badgeY + badgeHeight / 2, { baseline: 'middle' });

        y += titleHeight + 8;
    };
    
    const drawSectionHeader = (title: string) => {
        checkPageBreak(15);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_H2);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(title, PADDING, y);
        y += 2;
        doc.setDrawColor(...COLORS.CARD_BORDER);
        doc.line(PADDING, y, PADDING + MAX_CONTENT_WIDTH, y);
        y += 8;
    };

    const drawKeyValue = (key: string, value: any) => {
        if (value === undefined || value === null || value === '') return;

        let textValue: string, linkUrl: string | undefined;
        if (typeof value === 'object' && value !== null && 'text' in value) {
            textValue = value.text;
            linkUrl = value.link;
        } else {
            textValue = String(value);
        }
        
        doc.setFontSize(FONT_SIZE_NORMAL);
        const keyLines = doc.splitTextToSize(`${key}:`, KEY_COLUMN_WIDTH - 5);
        const valueLines = doc.splitTextToSize(textValue, VALUE_COLUMN_WIDTH);
        
        const requiredHeight = Math.max(keyLines.length, valueLines.length) * LINE_HEIGHT_NORMAL;
        checkPageBreak(requiredHeight + 2);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.TEXT_MUTED);
        doc.text(keyLines, PADDING, y, { baseline: 'top' });

        doc.setFont('helvetica', 'normal');
        if (linkUrl) {
            doc.setTextColor(...COLORS.LINK);
            doc.text(valueLines, VALUE_COLUMN_X, y, { baseline: 'top' });
            doc.link(VALUE_COLUMN_X, y, VALUE_COLUMN_WIDTH, requiredHeight, { url: linkUrl });
        } else {
            doc.setTextColor(...COLORS.TEXT_PRIMARY);
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
    drawHeader();
    await drawWatermark();
    
    drawTitleAndBadge(task.title, task.status);

    if (task.description) {
        drawSectionHeader(fieldLabels.get('description') || 'Description');
        const cleanDescription = task.description.replace(/(\*\*|_(.*?)_|\`|\~)/g, '');
        const lines = doc.splitTextToSize(cleanDescription, MAX_CONTENT_WIDTH);
        const descHeight = lines.length * LINE_HEIGHT_NORMAL;
        checkPageBreak(descHeight + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_NORMAL);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(lines, PADDING, y);
        y += descHeight + 10;
    }

    drawSectionHeader('Task Details');
    const assignedDevs = (task.developers || []).map(id => developersById.get(id)).filter(Boolean).join(', ');
    drawKeyValue(fieldLabels.get('developers') || 'Developers', assignedDevs || 'None');
    const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter(Boolean).join(', ');
    drawKeyValue(fieldLabels.get('testers') || 'Testers', assignedTesters || 'None');
    if (task.repositories && task.repositories.length > 0) {
        drawKeyValue(fieldLabels.get('repositories') || 'Repositories', task.repositories.join(', '));
    }
    if (task.azureWorkItemId) {
        const azureConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
        const url = azureConfig?.baseUrl ? `${azureConfig.baseUrl}${task.azureWorkItemId}` : '';
        drawKeyValue(fieldLabels.get('azureWorkItemId') || 'Azure Work Item ID', { text: `#${task.azureWorkItemId}`, link: url });
    }

    drawSectionHeader('Timeline & Deployments');
    if (task.devStartDate) drawKeyValue(fieldLabels.get('devStartDate') || 'Dev Start Date', format(new Date(task.devStartDate), 'MMMM do, yyyy'));
    if (task.devEndDate) drawKeyValue(fieldLabels.get('devEndDate') || 'Dev End Date', format(new Date(task.devEndDate), 'MMMM do, yyyy'));
    if (task.qaStartDate) drawKeyValue(fieldLabels.get('qaStartDate') || 'QA Start Date', format(new Date(task.qaStartDate), 'MMMM do, yyyy'));
    if (task.qaEndDate) drawKeyValue(fieldLabels.get('qaEndDate') || 'QA End Date', format(new Date(task.qaEndDate), 'MMMM do, yyyy'));
    
    uiConfig.environments.forEach((env: Environment) => {
        if (!env || !env.name) return;
        const isSelected = task.deploymentStatus?.[env.name] ?? false;
        const date = task.deploymentDates?.[env.name];
        if (isSelected) {
            const label = `${env.name.charAt(0).toUpperCase() + env.name.slice(1)} Deployed`;
            const val = date ? `on ${format(new Date(date), 'MMMM do, yyyy')}` : '(Deployed)';
            drawKeyValue(label, val);
        }
    });

    if (task.prLinks && Object.keys(task.prLinks).length > 0) {
        drawSectionHeader('Pull Requests');
        Object.entries(task.prLinks).forEach(([env, repos]) => {
            if (!repos) return;
            Object.entries(repos).forEach(([repoName, prIdString]) => {
                if (!prIdString) return;
                const prIds = prIdString.split(',').map(s => s.trim()).filter(Boolean);
                const repoConfig = uiConfig.repositoryConfigs.find(rc => rc.name === repoName);
                
                prIds.forEach(id => {
                    const baseUrl = repoConfig?.baseUrl || '';
                    const fullUrl = baseUrl ? `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${id}` : '';
                    const label = `${repoName} #${id} (${env})`;
                    drawKeyValue(label, { text: fullUrl || 'Link not available', link: fullUrl });
                });
            });
        });
    }

    if (task.attachments && task.attachments.length > 0) {
        drawSectionHeader(fieldLabels.get('attachments') || 'Attachments');
        for (const att of task.attachments) {
            if (att.type === 'image' && isDataURI(att.url)) {
                try {
                    const props = doc.getImageProperties(att.url);
                    const ratio = props.height / props.width;
                    const displayWidth = Math.min(MAX_CONTENT_WIDTH, 120); 
                    const displayHeight = displayWidth * ratio;
                    
                    checkPageBreak(displayHeight + 12);
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(8);
                    doc.setTextColor(...COLORS.TEXT_MUTED);
                    doc.text(`Image: ${att.name}`, PADDING, y);
                    y += 4;
                    
                    doc.addImage(att.url, props.fileType, PADDING, y, displayWidth, displayHeight);
                    y += displayHeight + 8;
                } catch (e) {
                    drawKeyValue(att.name, { text: att.url, link: att.url });
                }
            } else {
                drawKeyValue(att.name, { text: att.url, link: att.url });
            }
        }
    }

    if (customFields.length > 0) {
        drawSectionHeader('Other Details');
        customFields.forEach(field => {
            const val = task.customFields![field.key];
            const display = renderCustomFieldValue(field, val);
            drawKeyValue(field.label, display);
        });
    }

    if (task.comments && task.comments.length > 0) {
        drawSectionHeader(fieldLabels.get('comments') || 'Comments');
        task.comments.forEach(comment => {
            const date = format(new Date(comment.timestamp), 'MMM d, h:mm a');
            drawKeyValue(date, comment.text);
        });
    }

    drawFooter();
};

export const generateTaskPdf = async (
    tasks: Task[] | Task, 
    uiConfig: UiConfig, 
    developers: Person[], 
    testers: Person[], 
    outputType: 'save' | 'blob' = 'save',
    filename?: string,
    onProgress?: (progress: number) => void
): Promise<Blob | void> => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const tasksArray = Array.isArray(tasks) ? tasks : [tasks];
    
    for (let i = 0; i < tasksArray.length; i++) {
        const task = tasksArray[i];
        if (i > 0) {
            doc.addPage();
        }
        await _drawTaskOnPage(doc, task, uiConfig, developers, testers);
        if (onProgress) {
            onProgress(Math.round(((i + 1) / tasksArray.length) * 100));
        }
        // Yield to main thread to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    const sanitizeFilename = (name: string): string => {
        return name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
    };

    let finalFilename = filename;
    if (!finalFilename) {
        finalFilename = tasksArray.length === 1 
            ? `TF_Export_${sanitizeFilename(tasksArray[0].title)}.pdf`
            : 'TaskFlow_Bulk_Export.pdf';
    }
    
    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(finalFilename);
    }
};

export const generateTasksText = (
    tasks: Task[],
    uiConfig: UiConfig,
    allDevelopers: Person[],
    allTesters: Person[]
): string => {
    const developersById = new Map(allDevelopers.map(d => [d.id, d.name]));
    const testersById = new Map(allTesters.map(t => [t.id, t.name]));

    const stripMarkup = (text: string) => {
        return text.replace(/(\*\*|_(.*?)_|\`|\~)/g, '');
    };

    const taskStrings = tasks.map(task => {
        let text = `TASK: ${task.title}\nSTATUS: ${task.status}\n\n`;
        text += `DESCRIPTION:\n${stripMarkup(task.description)}\n\n`;
        
        const devs = (task.developers || []).map(id => developersById.get(id)).filter(Boolean).join(', ');
        text += `Developers: ${devs || 'None'}\n`;
        const test = (task.testers || []).map(id => testersById.get(id)).filter(Boolean).join(', ');
        text += `Testers: ${test || 'None'}\n`;
        const testRepos = Array.isArray(task.repositories) ? task.repositories : [];
        text += `Repositories: ${testRepos.join(', ') || 'None'}\n`;
        if (task.azureWorkItemId) text += `Azure Work Item: #${task.azureWorkItemId}\n`;
        
        return text;
    });

    return taskStrings.join('\n' + '='.repeat(40) + '\n\n');
};
