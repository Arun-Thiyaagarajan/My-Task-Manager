'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Task, UiConfig, Person, FieldConfig, Environment, Comment, Attachment } from './types';
import { pickDefaultIconName, resolveStatusConfig } from './status-config';

// --- SVG ICONS FOR PDF WATERMARK ---
const STATUS_SVG_ICONS: Record<string, string> = {
  'check-circle-2': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  circle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
  'loader-2': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  'git-pull-request': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 9 3 7.7 3 6"/><path d="M17.47 9c1.93 0 3.5-1.7 3.5-3"/><path d="M3 13h18"/><path d="M18 13v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2"/></svg>`,
  'pause-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>`,
  'clock-3': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/></svg>`,
  'play-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  'list-checks': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`,
};

type RgbTuple = [number, number, number];
type StatusPdfAssets = {
    label: string;
    colorHex: string;
    textColorHex: string;
    watermarkImage: string | null;
    badgeIconImage: string | null;
    watermarkImageFormat: 'PNG' | 'JPEG' | 'WEBP';
    badgeIconImageFormat: 'PNG' | 'JPEG' | 'WEBP';
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

const hexToRgb = (hex: string): RgbTuple => {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(char => char + char).join('')
        : normalized;
    const parsed = Number.parseInt(value, 16);

    if (Number.isNaN(parsed)) return [107, 114, 128];

    return [
        (parsed >> 16) & 255,
        (parsed >> 8) & 255,
        parsed & 255,
    ];
};

const getContrastTextHex = (hex: string): string => {
    const [r, g, b] = hexToRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? '#1f2937' : '#f8fafc';
};

const mixWithWhite = (hex: string, ratio: number): RgbTuple => {
    const [r, g, b] = hexToRgb(hex);
    const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio);
    return [mix(r), mix(g), mix(b)];
};

const getImageFormat = (dataUri: string): 'PNG' | 'JPEG' | 'WEBP' => {
    if (dataUri.startsWith('data:image/jpeg') || dataUri.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUri.startsWith('data:image/webp')) return 'WEBP';
    return 'PNG';
};

const colorSvg = (svg: string, hex: string) => svg.replace(/currentColor/g, hex);

const getStatusSvg = (iconName: string) => {
    return STATUS_SVG_ICONS[iconName] || STATUS_SVG_ICONS[pickDefaultIconName(iconName)] || STATUS_SVG_ICONS.circle;
};

const prepareStatusPdfAssets = async (task: Task, uiConfig: UiConfig): Promise<StatusPdfAssets> => {
    const status = resolveStatusConfig(task.status, uiConfig);
    const colorHex = status.color || '#64748b';
    const textColorHex = getContrastTextHex(colorHex);

    const fallbackIconName = pickDefaultIconName(status.name, colorHex);
    const iconName = status.iconType === 'image' ? fallbackIconName : (status.icon || fallbackIconName);
    const fallbackSvg = colorSvg(getStatusSvg(iconName), colorHex);

    let watermarkImage: string | null = null;
    let badgeIconImage: string | null = null;
    let watermarkImageFormat: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
    let badgeIconImageFormat: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';

    try {
        if (status.iconType === 'image' && isDataURI(status.icon)) {
            watermarkImage = status.icon;
            badgeIconImage = status.icon;
            watermarkImageFormat = getImageFormat(status.icon);
            badgeIconImageFormat = getImageFormat(status.icon);
        } else {
            const pngData = await svgToDataURL(fallbackSvg);
            watermarkImage = pngData;
            badgeIconImage = pngData;
        }
    } catch {
        try {
            const pngData = await svgToDataURL(colorSvg(getStatusSvg(fallbackIconName), colorHex));
            watermarkImage = pngData;
            badgeIconImage = pngData;
        } catch {
            watermarkImage = null;
            badgeIconImage = null;
        }
    }

    return {
        label: status.name || task.status || 'To Do',
        colorHex,
        textColorHex,
        watermarkImage,
        badgeIconImage,
        watermarkImageFormat,
        badgeIconImageFormat,
    };
};

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
    const statusAssets = await prepareStatusPdfAssets(task, uiConfig);

    // --- LAYOUT CONSTANTS & HELPERS ---
    const PADDING = 15;
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const MAX_CONTENT_WIDTH = PAGE_WIDTH - PADDING * 2;
    
    const KEY_COLUMN_WIDTH = 55;
    const VALUE_COLUMN_X = PADDING + KEY_COLUMN_WIDTH;
    const VALUE_COLUMN_WIDTH = MAX_CONTENT_WIDTH - KEY_COLUMN_WIDTH;

    const FONT_SIZE_NORMAL = 10;
    const FONT_SIZE_SMALL = 8;
    const FONT_SIZE_H1 = 18;
    const FONT_SIZE_H2 = 13;
    const LINE_HEIGHT_NORMAL = 6;

    const COLORS: Record<string, RgbTuple> = {
        TEXT_PRIMARY: [31, 41, 55],
        TEXT_MUTED: [107, 114, 128],
        CARD_BORDER: [229, 231, 235],
        LINK: [11, 87, 208],
        WATERMARK: [240, 240, 240],
    };

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
    
    const drawWatermark = () => {
        if (!statusAssets.watermarkImage) return;
        const iconSize = 140;
        const x = (PAGE_WIDTH - iconSize) / 2;
        const y_pos = (PAGE_HEIGHT - iconSize) / 2;

        try {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
            doc.addImage(statusAssets.watermarkImage, statusAssets.watermarkImageFormat, x, y_pos, iconSize, iconSize);
            doc.restoreGraphicsState();
        } catch (e) {
            console.error("Failed to render watermark:", e);
        }
    };

    const drawTitleAndBadge = (text: string, status: string) => {
        doc.setFontSize(FONT_SIZE_H1);
        doc.setFont('helvetica', 'bold');
        
        const titleLines = doc.splitTextToSize(text, MAX_CONTENT_WIDTH - 40);
        const titleHeight = titleLines.length * (LINE_HEIGHT_NORMAL * 1.2);
        
        y = PADDING + 15;
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(titleLines, PADDING, y, { baseline: 'top' });

        // Badge at top right
        doc.setFontSize(9);
        const badgeLabel = statusAssets.label || status;
        const iconSpace = statusAssets.badgeIconImage ? 7 : 0;
        const statusWidth = doc.getTextWidth(badgeLabel);
        const badgeWidth = statusWidth + 10 + iconSpace;
        const badgeHeight = 7;
        const badgeX = PAGE_WIDTH - PADDING - badgeWidth;
        const badgeY = y;
        const badgeBg = mixWithWhite(statusAssets.colorHex, 0.82);
        const badgeText = hexToRgb(statusAssets.colorHex);
        const badgeBorder = mixWithWhite(statusAssets.colorHex, 0.58);

        doc.setFillColor(...badgeBg);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'F');
        doc.setDrawColor(...badgeBorder);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'S');

        if (statusAssets.badgeIconImage) {
            try {
                doc.addImage(statusAssets.badgeIconImage, statusAssets.badgeIconImageFormat, badgeX + 2.5, badgeY + 1.5, 4, 4);
            } catch {}
        }
        
        doc.setTextColor(...badgeText);
        doc.text(badgeLabel, badgeX + 5 + iconSpace, badgeY + badgeHeight / 2, { baseline: 'middle' });

        y += titleHeight + 8;
    };

    const estimateKeyValueHeight = (key: string, value: any) => {
        if (value === undefined || value === null || value === '') return 0;

        let textValue: string;
        if (typeof value === 'object' && value !== null && 'text' in value) {
            textValue = value.text;
        } else {
            textValue = String(value);
        }

        doc.setFontSize(FONT_SIZE_NORMAL);
        const keyLines = doc.splitTextToSize(`${key}:`, KEY_COLUMN_WIDTH - 5);
        const valueLines = doc.splitTextToSize(textValue, VALUE_COLUMN_WIDTH);
        return Math.max(keyLines.length, valueLines.length) * LINE_HEIGHT_NORMAL + 2;
    };
    
    const drawSectionHeader = (title: string, firstContentHeight = 0) => {
        // Keep the section title with the first content block on the same page.
        checkPageBreak(25 + firstContentHeight);
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
    drawWatermark();
    
    drawTitleAndBadge(task.title, statusAssets.label);

    if (task.description) {
        drawSectionHeader(fieldLabels.get('description') || 'Description', 12);
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

    const assignedDevs = (task.developers || []).map(id => developersById.get(id)).filter(Boolean).join(', ');
    const firstTaskDetailsHeight = estimateKeyValueHeight(
        fieldLabels.get('developers') || 'Developers',
        assignedDevs || 'None'
    );
    drawSectionHeader('Task Details', firstTaskDetailsHeight);
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

    const firstTimelineValue =
        task.devStartDate ? format(new Date(task.devStartDate), 'MMMM do, yyyy') :
        task.devEndDate ? format(new Date(task.devEndDate), 'MMMM do, yyyy') :
        task.qaStartDate ? format(new Date(task.qaStartDate), 'MMMM do, yyyy') :
        task.qaEndDate ? format(new Date(task.qaEndDate), 'MMMM do, yyyy') :
        '';
    const firstTimelineLabel =
        task.devStartDate ? (fieldLabels.get('devStartDate') || 'Dev Start Date') :
        task.devEndDate ? (fieldLabels.get('devEndDate') || 'Dev End Date') :
        task.qaStartDate ? (fieldLabels.get('qaStartDate') || 'QA Start Date') :
        task.qaEndDate ? (fieldLabels.get('qaEndDate') || 'QA End Date') :
        '';
    drawSectionHeader('Timeline & Deployments', estimateKeyValueHeight(firstTimelineLabel, firstTimelineValue));
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

    const prField = () => uiConfig?.fields?.find(f => f.key === 'prLinks' && f.isActive);

    if (prField() && task.prLinks && Object.keys(task.prLinks).length > 0) {
        let firstPrLabel = '';
        let firstPrValue: { text: string; link: string } | '' = '';
        outer: for (const [env, repos] of Object.entries(task.prLinks)) {
            if (!repos) continue;
            for (const [repoName, prIdString] of Object.entries(repos)) {
                if (!prIdString) continue;
                const firstPrId = prIdString.split(',').map(s => s.trim()).filter(Boolean)[0];
                if (!firstPrId) continue;
                const repoConfig = uiConfig.repositoryConfigs.find(rc => rc.name === repoName);
                const baseUrl = repoConfig?.baseUrl || '';
                const fullUrl = baseUrl ? `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${firstPrId}` : '';
                firstPrLabel = `${repoName} #${firstPrId} (${env})`;
                firstPrValue = { text: `PR #${firstPrId}`, link: fullUrl };
                break outer;
            }
        }
        drawSectionHeader('Pull Requests', estimateKeyValueHeight(firstPrLabel, firstPrValue));
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
                    drawKeyValue(label, { text: fullUrl ? `PR #${id}` : 'Link not available', link: fullUrl });
                });
            });
        });
    }

    if (task.attachments && task.attachments.length > 0) {
        let firstAttachmentHeight = 0;
        const firstAttachment = task.attachments[0];
        if (firstAttachment) {
            if (firstAttachment.type === 'image' && isDataURI(firstAttachment.url)) {
                try {
                    const props = doc.getImageProperties(firstAttachment.url);
                    const ratio = props.height / props.width;
                    const displayWidth = Math.min(MAX_CONTENT_WIDTH, 120);
                    const displayHeight = displayWidth * ratio;
                    firstAttachmentHeight = displayHeight + 15;
                } catch {
                    firstAttachmentHeight = estimateKeyValueHeight(firstAttachment.name, { text: firstAttachment.url, link: firstAttachment.url });
                }
            } else {
                firstAttachmentHeight = estimateKeyValueHeight(firstAttachment.name, { text: firstAttachment.url, link: firstAttachment.url });
            }
        }
        drawSectionHeader(fieldLabels.get('attachments') || 'Attachments', firstAttachmentHeight);
        for (const att of task.attachments) {
            if (att.type === 'image' && isDataURI(att.url)) {
                try {
                    const props = doc.getImageProperties(att.url);
                    const ratio = props.height / props.width;
                    const displayWidth = Math.min(MAX_CONTENT_WIDTH, 120); 
                    const displayHeight = displayWidth * ratio;
                    
                    // Check if image + caption will fit
                    checkPageBreak(displayHeight + 15);
                    
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(FONT_SIZE_SMALL);
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
        const firstField = customFields[0];
        const firstFieldDisplay = firstField ? renderCustomFieldValue(firstField, task.customFields![firstField.key]) : '';
        drawSectionHeader('Other Details', firstField ? estimateKeyValueHeight(firstField.label, firstFieldDisplay) : 0);
        customFields.forEach(field => {
            const val = task.customFields![field.key];
            const display = renderCustomFieldValue(field, val);
            drawKeyValue(field.label, display);
        });
    }

    if (task.comments && task.comments.length > 0) {
        const firstComment = task.comments[0];
        const firstCommentLabel = firstComment ? format(new Date(firstComment.timestamp), 'MMM d, h:mm a') : '';
        const firstCommentValue = firstComment?.text || '';
        drawSectionHeader(fieldLabels.get('comments') || 'Comments', estimateKeyValueHeight(firstCommentLabel, firstCommentValue));
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
