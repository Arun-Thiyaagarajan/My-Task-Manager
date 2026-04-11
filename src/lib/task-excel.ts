import type { FieldConfig, FieldType, Person, Task, UiConfig } from '@/lib/types';

export const TASK_EXCEL_EXPORT_METADATA_SHEET = '_TaskFlow_Metadata';
const TASK_EXCEL_EXPORT_SOURCE = 'taskflow_export_v1';

export interface ExcelTaskColumn {
  key: string;
  header: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  isUnique: boolean;
  isCustom: boolean;
  importable: boolean;
  exportable: boolean;
  options?: string[];
}

export interface ExcelTemplateColumnGuide {
  column: string;
  note: string;
  type: string;
  required: string;
  unique: string;
  format: string;
  allowedValues: string;
}

export interface ImportedTaskReviewRow {
  id: string;
  rowNumber: number;
  values: Record<string, string>;
  normalizedTask: Partial<Task>;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export interface ImportValidationContext {
  uiConfig: UiConfig;
  tasks: Task[];
  developers: Person[];
  testers: Person[];
}

type WorkbookLike = {
  SheetNames?: string[];
  Sheets?: Record<string, unknown>;
  Workbook?: {
    Sheets?: Array<{ name?: string; Hidden?: number }>;
  };
};

const EXTRA_EXPORT_COLUMNS: ExcelTaskColumn[] = [
  { key: 'id', label: 'Task ID', header: 'Task ID', type: 'text', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'createdAt', label: 'Created At', header: 'Created At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'updatedAt', label: 'Updated At', header: 'Updated At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'deletedAt', label: 'Deleted At', header: 'Deleted At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'summary', label: 'Summary', header: 'Summary', type: 'textarea', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'isFavorite', label: 'Favorite', header: 'Favorite', type: 'checkbox', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'priority', label: 'Priority', header: 'Priority', type: 'select', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true, options: ['low', 'medium', 'high', 'urgent'] },
  { key: 'dueAt', label: 'Due At', header: 'Due At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true },
  { key: 'dueCompletedAt', label: 'Due Completed At', header: 'Due Completed At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true },
  { key: 'dueReminderAt', label: 'Due Reminder At', header: 'Due Reminder At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true },
  { key: 'dueReminderPreset', label: 'Due Reminder Preset', header: 'Due Reminder Preset', type: 'select', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true, options: ['at_due', '15m_before', '1h_before', '1d_before', 'custom'] },
  { key: 'reminder', label: 'Reminder', header: 'Reminder', type: 'text', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true },
  { key: 'reminderExpiresAt', label: 'Reminder Expires At', header: 'Reminder Expires At', type: 'date', isRequired: false, isUnique: false, isCustom: false, importable: true, exportable: true },
  { key: 'attachments', label: 'Attachments', header: 'Attachments', type: 'object', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'comments', label: 'Comments', header: 'Comments', type: 'object', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'prLinks', label: 'Pull Request Links', header: 'Pull Request Links', type: 'object', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'deploymentStatus', label: 'Deployment Status', header: 'Deployment Status', type: 'object', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
  { key: 'deploymentDates', label: 'Deployment Dates', header: 'Deployment Dates', type: 'object', isRequired: false, isUnique: false, isCustom: false, importable: false, exportable: true },
];

const COMMA_SPLIT_REGEX = /[,;\n]+/;

const normalizeHeaderToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\(required\)/g, '')
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return JSON.stringify(value);
};

const splitMultiValue = (value: string): string[] =>
  value
    .split(COMMA_SPLIT_REGEX)
    .map(item => item.trim())
    .filter(Boolean);

const buildValidDate = (year: number, month: number, day: number): Date | null => {
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parseExcelSerialDate = (serialValue: number): Date | null => {
  if (!Number.isFinite(serialValue) || serialValue <= 0) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const parsed = new Date(excelEpoch.getTime() + serialValue * 24 * 60 * 60 * 1000);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeDateString = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dayMonthYearMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayMonthYearMatch) {
    const [, day, month, year] = dayMonthYearMatch;
    const parsed = buildValidDate(Number(year), Number(month), Number(day));
    return parsed ? parsed.toISOString() : null;
  }

  const excelSerial = Number(trimmed);
  if (!Number.isNaN(excelSerial) && /^\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = parseExcelSerialDate(excelSerial);
    return parsed ? parsed.toISOString() : null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const parseBoolean = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['true', 'yes', 'y', '1', 'checked', 'done'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'unchecked', 'pending'].includes(normalized)) return false;
  return null;
};

const stringifyCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatExportDateValue = (value: unknown): string => {
  if (!value) return '';

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return stringifyCellValue(value);

  const day = `${parsed.getDate()}`.padStart(2, '0');
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
};

const stringifyArrayExportValue = (values: unknown[]): string =>
  values
    .map(value => normalizeString(value))
    .filter(Boolean)
    .join(', ');

const formatSelectableExportValue = (value: unknown, options?: string[]): string => {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return '';
  if (!options?.length) return normalizedValue;
  return normalizeOptionValue(normalizedValue, options);
};

const getTaskFieldValue = (task: Task, key: string): unknown => {
  return (task as unknown as Record<string, unknown>)[key];
};

const getRawTaskValue = (task: Task, column: ExcelTaskColumn): unknown => {
  if (column.isCustom) {
    return task.customFields?.[column.key];
  }

  return getTaskFieldValue(task, column.key);
};

const buildColumnFromField = (field: FieldConfig): ExcelTaskColumn => {
  const importable = field.type !== 'object';

  return {
    key: field.key,
    label: field.label,
    header: field.label,
    type: field.type,
    isRequired: field.isRequired,
    isUnique: field.isUnique,
    isCustom: field.isCustom,
    importable,
    exportable: true,
    options: field.options?.map(option => option.value),
  };
};

export function getExcelTaskColumns(uiConfig: UiConfig) {
  const uiColumns = uiConfig.fields
    .filter(field => field.isActive)
    .map(buildColumnFromField);
  const importableExtraColumns = EXTRA_EXPORT_COLUMNS.filter(column => column.importable);

  return {
    importColumns: [...uiColumns.filter(column => column.importable), ...importableExtraColumns],
    exportColumns: [...uiColumns, ...EXTRA_EXPORT_COLUMNS],
  };
}

export function getExcelTemplateHeaders(uiConfig: UiConfig): string[] {
  return getExcelTaskColumns(uiConfig).importColumns.map(column => column.header);
}

export function buildExcelTemplateInstructions(uiConfig: UiConfig): ExcelTemplateColumnGuide[] {
  return getExcelTaskColumns(uiConfig).importColumns.map(column => ({
    column: column.header,
    note: getColumnTemplateNote(column, uiConfig),
    type: column.type,
    required: column.isRequired ? 'Yes' : 'No',
    unique: column.isUnique ? 'Yes' : 'No',
    format: getColumnFormatHint(column, uiConfig),
    allowedValues: getAllowedValuesHint(column, uiConfig),
  }));
}

function getColumnFormatHint(column: ExcelTaskColumn, uiConfig: UiConfig): string {
  if (column.key === 'status') {
    return `Use one of: ${uiConfig.taskStatuses.join(', ') || 'Current task statuses'}`;
  }

  if (column.key === 'repositories') {
    return 'Comma-separated repository names';
  }

  if (column.key === 'developers' || column.key === 'testers') {
    return 'Comma-separated existing people names';
  }

  if (column.key === 'relevantEnvironments') {
    return 'Comma-separated environment names';
  }

  if (column.type === 'multiselect' || column.type === 'tags') {
    return 'Comma-separated values';
  }

  if (column.type === 'checkbox') {
    return 'Use Yes/No or True/False';
  }

  if (column.type === 'date') {
    return 'Prefer DD-MM-YYYY, for example 03-04-2026';
  }

  if (column.type === 'select' && column.options?.length) {
    return `Use one of: ${column.options.join(', ')}`;
  }

  if (column.type === 'number') {
    return 'Numeric value only';
  }

  if (column.type === 'url') {
    return 'Full URL starting with http:// or https://';
  }

  return 'Plain text';
}

function getAllowedValuesHint(column: ExcelTaskColumn, uiConfig: UiConfig): string {
  if (column.key === 'status') {
    return uiConfig.taskStatuses.join(', ') || 'Configured statuses';
  }

  if (column.key === 'repositories') {
    return uiConfig.repositoryConfigs.map(repo => repo.name).join(', ') || 'Configured repositories';
  }

  if (column.key === 'relevantEnvironments') {
    return uiConfig.environments.map(environment => environment.name).join(', ') || 'Configured environments';
  }

  if (column.options?.length) {
    return column.options.join(', ');
  }

  return 'Free-form';
}

function getColumnTemplateNote(column: ExcelTaskColumn, uiConfig: UiConfig): string {
  const parts = [
    column.isRequired ? 'Required field.' : 'Optional field.',
    `Type: ${column.type}.`,
    `Format: ${getColumnFormatHint(column, uiConfig)}.`,
  ];

  const allowedValues = getAllowedValuesHint(column, uiConfig);
  if (allowedValues !== 'Free-form') {
    parts.push(`Allowed values: ${allowedValues}.`);
  }

  if (column.isUnique) {
    parts.push('Value must be unique across tasks.');
  }

  return parts.join(' ');
}

export function buildExcelExportRows(
  tasks: Task[],
  uiConfig: UiConfig,
  developers: Person[],
  testers: Person[]
): Record<string, string>[] {
  const { importColumns } = getExcelTaskColumns(uiConfig);
  const developerMap = new Map(developers.map(person => [person.id, person.name]));
  const testerMap = new Map(testers.map(person => [person.id, person.name]));

  return tasks.map(task => {
    const row: Record<string, string> = {};

    importColumns.forEach(column => {
      const rawValue = getRawTaskValue(task, column);

      if (column.key === 'developers' && Array.isArray(rawValue)) {
        row[column.header] = rawValue
          .map(value => developerMap.get(String(value)) || normalizeString(value))
          .filter(Boolean)
          .join(', ');
        return;
      }

      if (column.key === 'testers' && Array.isArray(rawValue)) {
        row[column.header] = rawValue
          .map(value => testerMap.get(String(value)) || normalizeString(value))
          .filter(Boolean)
          .join(', ');
        return;
      }

      if (column.type === 'date') {
        row[column.header] = formatExportDateValue(rawValue);
        return;
      }

       if (
        column.key === 'repositories' ||
        column.key === 'tags' ||
        column.key === 'relevantEnvironments' ||
        column.type === 'multiselect'
      ) {
        row[column.header] = Array.isArray(rawValue)
          ? stringifyArrayExportValue(
              rawValue.map(value =>
                column.options?.length ? normalizeOptionValue(normalizeString(value), column.options) : normalizeString(value)
              )
            )
          : normalizeString(rawValue);
        return;
      }

      if (column.type === 'select') {
        row[column.header] = formatSelectableExportValue(rawValue, column.options);
        return;
      }

      if (column.type === 'checkbox') {
        const parsed = typeof rawValue === 'boolean' ? rawValue : parseBoolean(normalizeString(rawValue));
        row[column.header] = parsed === null ? normalizeString(rawValue) : parsed ? 'Yes' : 'No';
        return;
      }

      row[column.header] = stringifyCellValue(rawValue);
    });

    return row;
  });
}

export function appendExcelExportMetadataSheet(
  workbook: WorkbookLike,
  utils: any,
  metadata: {
    appName: string;
    exportType: string;
    primarySheet: string;
    taskCount: number;
  }
) {
  const sheet = utils.json_to_sheet([
    { Key: 'Source', Value: TASK_EXCEL_EXPORT_SOURCE },
    { Key: 'Format', Value: 'template_compatible_v1' },
    { Key: 'Primary Sheet', Value: metadata.primarySheet },
    { Key: 'Export Type', Value: metadata.exportType },
    { Key: 'App Name', Value: metadata.appName || 'My Task Manager' },
    { Key: 'Exported At', Value: new Date().toISOString() },
    { Key: 'Task Count', Value: String(metadata.taskCount) },
  ]);

  utils.book_append_sheet(workbook, sheet, TASK_EXCEL_EXPORT_METADATA_SHEET);

  if (!workbook.Workbook) {
    workbook.Workbook = { Sheets: [] };
  }

  if (!workbook.Workbook.Sheets) {
    workbook.Workbook.Sheets = [];
  }

  const existingSheet = workbook.Workbook.Sheets.find(entry => entry.name === TASK_EXCEL_EXPORT_METADATA_SHEET);
  if (existingSheet) {
    existingSheet.Hidden = 1;
    return;
  }

  workbook.Workbook.Sheets.push({
    name: TASK_EXCEL_EXPORT_METADATA_SHEET,
    Hidden: 1,
  });
}

export function readExcelExportMetadata(
  workbook: WorkbookLike,
  utils: any
): Record<string, string> | null {
  const metadataSheet = workbook.Sheets?.[TASK_EXCEL_EXPORT_METADATA_SHEET];
  if (!metadataSheet) return null;

  const rows = utils.sheet_to_json(metadataSheet, { defval: '' }) as Array<Record<string, unknown>>;
  const metadata = rows.reduce((accumulator: Record<string, string>, row: Record<string, unknown>) => {
    const key = typeof row.Key === 'string' ? row.Key : '';
    const value = typeof row.Value === 'string' ? row.Value : String(row.Value || '');
    if (key) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  return metadata.Source === TASK_EXCEL_EXPORT_SOURCE ? metadata : null;
}

export function normalizeAppExportSheetRows(sheetRows: unknown[][], uiConfig: UiConfig): unknown[][] {
  const { importColumns } = getExcelTaskColumns(uiConfig);
  const [headerRow = [], ...dataRows] = sheetRows;
  const headerToColumn = new Map<string, ExcelTaskColumn>();

  importColumns.forEach(column => {
    headerToColumn.set(normalizeHeaderToken(column.header), column);
    headerToColumn.set(normalizeHeaderToken(column.label), column);
    headerToColumn.set(normalizeHeaderToken(column.key), column);
  });

  const mappedColumns = headerRow.map(cell => headerToColumn.get(normalizeHeaderToken(normalizeString(cell))) || null);

  const normalizedDataRows = dataRows.map(row =>
    row.map((cell, columnIndex) => {
      const column = mappedColumns[columnIndex];
      if (!column) return cell;

      const rawValue = normalizeString(cell);
      if (!rawValue) return '';

      if (column.type === 'date') {
        return formatExportDateValue(rawValue);
      }

      if (column.type === 'checkbox') {
        const parsed = parseBoolean(rawValue);
        return parsed === null ? rawValue : parsed ? 'Yes' : 'No';
      }

      if (column.type === 'multiselect' || column.type === 'tags' || ['repositories', 'developers', 'testers', 'relevantEnvironments'].includes(column.key)) {
        return splitMultiValue(rawValue).join(', ');
      }

      if (column.key === 'status') {
        return normalizeStatusValue(rawValue, uiConfig);
      }

      return rawValue;
    })
  );

  return [headerRow, ...normalizedDataRows];
}

export function parseExcelSheetRows(
  sheetRows: unknown[][],
  uiConfig: UiConfig
): Array<{ rowNumber: number; values: Record<string, string> }> {
  const { importColumns } = getExcelTaskColumns(uiConfig);
  const knownColumns = new Map<string, ExcelTaskColumn>();

  importColumns.forEach(column => {
    knownColumns.set(normalizeHeaderToken(column.header), column);
    knownColumns.set(normalizeHeaderToken(column.label), column);
    knownColumns.set(normalizeHeaderToken(column.key), column);
  });

  const [headerRow = []] = sheetRows;
  const mappedColumns = headerRow.map(cell => {
    const token = normalizeHeaderToken(normalizeString(cell));
    return knownColumns.get(token) || null;
  });

  return sheetRows.slice(1).map((row, index) => {
    const values: Record<string, string> = {};

    mappedColumns.forEach((column, columnIndex) => {
      if (!column) return;
      values[column.key] = normalizeString(row[columnIndex]);
    });

    return {
      rowNumber: index + 1,
      values,
    };
  });
}

export function getExcelHeaderValidationError(sheetRows: unknown[][], uiConfig: UiConfig): string | null {
  const { importColumns } = getExcelTaskColumns(uiConfig);
  const expectedHeaders = importColumns.map(column => normalizeHeaderToken(column.header));
  const [headerRow = []] = sheetRows;
  const actualHeaders = headerRow.map(cell => normalizeHeaderToken(normalizeString(cell)));

  const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header));
  if (missingHeaders.length === 0) return null;

  const missingLabels = importColumns
    .filter(column => missingHeaders.includes(normalizeHeaderToken(column.header)))
    .map(column => column.header);

  return `The workbook headers were changed or are incomplete. Please download a fresh template and keep all column headers unchanged. Missing headers: ${missingLabels.join(', ')}.`;
}

export function analyzeExcelHeaderStructure(
  sheetRows: unknown[][],
  uiConfig: UiConfig
): {
  isCompletelyInvalid: boolean;
  missingHeaders: string[];
} | null {
  const { importColumns } = getExcelTaskColumns(uiConfig);
  const [headerRow = []] = sheetRows;
  const actualHeaders = headerRow.map(cell => normalizeHeaderToken(normalizeString(cell)));
  const matchedColumns = importColumns.filter(column => actualHeaders.includes(normalizeHeaderToken(column.header)));

  if (matchedColumns.length === importColumns.length) return null;

  return {
    isCompletelyInvalid: matchedColumns.length === 0,
    missingHeaders: importColumns
      .filter(column => !actualHeaders.includes(normalizeHeaderToken(column.header)))
      .map(column => column.header),
  };
}

function hasUsableValue(values: Record<string, string>): boolean {
  return Object.values(values).some(value => value.trim().length > 0);
}

function buildPeopleIdMap(people: Person[]) {
  return new Map(people.map(person => [person.name.trim().toLowerCase(), person.id]));
}

function buildPeopleNameMap(people: Person[]) {
  return new Map(people.map(person => [person.id, person.name]));
}

function getPersonNameById(value: string, people: Person[]): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  const match = people.find(person => person.id === trimmedValue);
  return match?.name || null;
}

function validateOptionValue(value: string, options: string[]): boolean {
  return options.some(option => option.trim().toLowerCase() === value.trim().toLowerCase());
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () => Array<number>(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function normalizeLooseToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findBestSmartMatch(value: string, candidates: string[]): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const normalizedValue = normalizeLooseToken(trimmedValue);
  const directMatch = candidates.find(candidate => candidate.trim().toLowerCase() === trimmedValue.toLowerCase());
  if (directMatch) return directMatch;

  const normalizedMatch = candidates.find(candidate => normalizeLooseToken(candidate) === normalizedValue);
  if (normalizedMatch) return normalizedMatch;

  let bestMatch: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach(candidate => {
    const score = levenshteinDistance(normalizedValue, normalizeLooseToken(candidate));
    if (score < bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  });

  if (!bestMatch) return null;

  const candidateLength = Math.max(normalizedValue.length, normalizeLooseToken(bestMatch).length);
  if (bestScore <= 2 || bestScore / Math.max(candidateLength, 1) <= 0.25) {
    return bestMatch;
  }

  return null;
}

function normalizeOptionValue(value: string, options: string[]): string {
  const match = findBestSmartMatch(value, options);
  return match || value.trim();
}

function normalizeStatusValue(value: string, uiConfig: UiConfig): string {
  const allStatusCandidates = [
    ...uiConfig.taskStatuses,
    ...(uiConfig.statusConfigs || []).flatMap(status => [status.name, ...(status.aliases || [])]),
  ];

  const match = findBestSmartMatch(value, allStatusCandidates);
  if (!match) return value.trim();

  const configMatch = (uiConfig.statusConfigs || []).find(status =>
    [status.name, ...(status.aliases || [])].some(candidate => candidate.trim().toLowerCase() === match.trim().toLowerCase())
  );

  return configMatch?.name || uiConfig.taskStatuses.find(status => status.trim().toLowerCase() === match.trim().toLowerCase()) || match;
}

function normalizeCustomFieldValue(column: ExcelTaskColumn, value: string): unknown {
  if (!value.trim()) return undefined;

  if (column.type === 'number') return Number(value);
  if (column.type === 'checkbox') return parseBoolean(value);
  if (column.type === 'date') return normalizeDateString(value);
  if (column.type === 'multiselect' || column.type === 'tags') return splitMultiValue(value);
  if (column.type === 'object') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value.trim();
}

function buildNormalizedTask(
  values: Record<string, string>,
  importColumns: ExcelTaskColumn[],
  uiConfig: UiConfig,
  developerNameToId: Map<string, string>,
  testerNameToId: Map<string, string>,
  developerIdToName: Map<string, string>,
  testerIdToName: Map<string, string>
): Partial<Task> {
  const normalizedTask: Partial<Task> = {
    customFields: {},
  };

  importColumns.forEach(column => {
    const rawValue = values[column.key] || '';
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) return;

    if (column.key === 'developers') {
      normalizedTask.developers = splitMultiValue(rawValue)
        .map(item => {
          const matchedPersonName = developerIdToName.get(item.trim());
          if (matchedPersonName) {
            return developerNameToId.get(matchedPersonName.trim().toLowerCase()) || item;
          }
          const smartMatch = findBestSmartMatch(item, Array.from(developerNameToId.keys()));
          return developerNameToId.get((smartMatch || item).toLowerCase()) || item;
        })
        .filter(Boolean);
      return;
    }

    if (column.key === 'testers') {
      normalizedTask.testers = splitMultiValue(rawValue)
        .map(item => {
          const matchedPersonName = testerIdToName.get(item.trim());
          if (matchedPersonName) {
            return testerNameToId.get(matchedPersonName.trim().toLowerCase()) || item;
          }
          const smartMatch = findBestSmartMatch(item, Array.from(testerNameToId.keys()));
          return testerNameToId.get((smartMatch || item).toLowerCase()) || item;
        })
        .filter(Boolean);
      return;
    }

    if (column.key === 'repositories' || column.key === 'tags' || column.key === 'relevantEnvironments') {
      const sourceOptions =
        column.key === 'repositories'
          ? uiConfig.repositoryConfigs.map(repo => repo.name)
          : column.key === 'relevantEnvironments'
            ? uiConfig.environments.map(environment => environment.name)
            : column.options || [];

      (normalizedTask as Record<string, unknown>)[column.key] = splitMultiValue(rawValue).map(item =>
        sourceOptions.length > 0 ? normalizeOptionValue(item, sourceOptions) : item
      );
      return;
    }

    if (column.type === 'checkbox') {
      (normalizedTask as Record<string, unknown>)[column.key] = parseBoolean(rawValue);
      return;
    }

    if (column.type === 'date') {
      (normalizedTask as Record<string, unknown>)[column.key] = normalizeDateString(rawValue);
      return;
    }

    if (column.type === 'number') {
      (normalizedTask as Record<string, unknown>)[column.key] = Number(rawValue);
      return;
    }

    if (column.type === 'multiselect' || column.type === 'tags') {
      const parsed = splitMultiValue(rawValue).map(item =>
        column.options?.length ? normalizeOptionValue(item, column.options) : item
      );
      if (column.isCustom) {
        normalizedTask.customFields = {
          ...(normalizedTask.customFields || {}),
          [column.key]: parsed,
        };
      } else {
        (normalizedTask as Record<string, unknown>)[column.key] = parsed;
      }
      return;
    }

    if (column.isCustom) {
      normalizedTask.customFields = {
        ...(normalizedTask.customFields || {}),
        [column.key]: normalizeCustomFieldValue(column, rawValue),
      };
      return;
    }

    if (column.key === 'status') {
      normalizedTask.status = normalizeStatusValue(rawValue, uiConfig);
      return;
    }

    if (column.type === 'select' && column.options?.length) {
      (normalizedTask as Record<string, unknown>)[column.key] = normalizeOptionValue(rawValue, column.options);
      return;
    }

    (normalizedTask as Record<string, unknown>)[column.key] = rawValue.trim();
  });

  if (normalizedTask.customFields && Object.keys(normalizedTask.customFields).length === 0) {
    delete normalizedTask.customFields;
  }

  return normalizedTask;
}

export function validateImportedTaskRows(
  rawRows: Array<{ id: string; rowNumber: number; values: Record<string, string> }>,
  context: ImportValidationContext
): ImportedTaskReviewRow[] {
  const { importColumns } = getExcelTaskColumns(context.uiConfig);
  const developerNameToId = buildPeopleIdMap(context.developers);
  const testerNameToId = buildPeopleIdMap(context.testers);
  const developerIdToName = buildPeopleNameMap(context.developers);
  const testerIdToName = buildPeopleNameMap(context.testers);
  const repositoryNames = new Set(context.uiConfig.repositoryConfigs.map(repo => repo.name.trim().toLowerCase()));
  const environmentNames = new Set(context.uiConfig.environments.map(environment => environment.name.trim().toLowerCase()));
  const allowedStatuses = new Set(
    [
      ...context.uiConfig.taskStatuses,
      ...(context.uiConfig.statusConfigs || []).flatMap(status => [status.name, ...(status.aliases || [])]),
    ]
      .map(status => status.trim().toLowerCase())
      .filter(Boolean)
  );

  const existingUniqueValues = new Map<string, Set<string>>();
  context.uiConfig.fields
      .filter(field => field.isActive && field.isUnique)
    .forEach(field => {
      const values = new Set<string>();
      context.tasks.forEach(task => {
        const rawValue = field.isCustom ? task.customFields?.[field.key] : getTaskFieldValue(task, field.key);
        if (typeof rawValue === 'string' && rawValue.trim()) {
          values.add(rawValue.trim().toLowerCase());
        }
      });
      existingUniqueValues.set(field.key, values);
    });

  const fileUniqueValues = new Map<string, Map<string, number>>();

  return rawRows.map(rawRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedTask = buildNormalizedTask(
      rawRow.values,
      importColumns,
      context.uiConfig,
      developerNameToId,
      testerNameToId,
      developerIdToName,
      testerIdToName
    );

    if (!hasUsableValue(rawRow.values)) {
      errors.push('This row is empty.');
    }

    importColumns.forEach(column => {
      const rawValue = rawRow.values[column.key] || '';
      const trimmedValue = rawValue.trim();
      const displayName = column.label;

      if (column.isRequired) {
        if (column.type === 'multiselect' || column.type === 'tags' || ['developers', 'testers', 'repositories', 'relevantEnvironments'].includes(column.key)) {
          if (splitMultiValue(rawValue).length === 0) {
            errors.push(`${displayName} is required.`);
          }
        } else if (!trimmedValue) {
          errors.push(`${displayName} is required.`);
        }
      }

      if (!trimmedValue) return;

      if (column.key === 'title' && trimmedValue.length < 3) {
        errors.push('Title must be at least 3 characters.');
      }

      if (column.key === 'description' && trimmedValue.length < 3) {
        errors.push('Description must be at least 3 characters.');
      }

      if (column.key === 'status' && !allowedStatuses.has(trimmedValue.toLowerCase())) {
        const suggestedStatus = normalizeStatusValue(trimmedValue, context.uiConfig);
        if (allowedStatuses.has(suggestedStatus.toLowerCase())) {
          warnings.push(`Status was normalized from "${trimmedValue}" to "${suggestedStatus}".`);
        } else {
          errors.push(`Status must match one of the configured task statuses.`);
        }
      }

      if (column.key === 'azureWorkItemId' && !/^\d+$/.test(trimmedValue)) {
        errors.push('Azure Work Item ID must contain digits only.');
      }

      if (column.key === 'repositories') {
        const newValues = splitMultiValue(rawValue).filter(value => {
          const smartMatch = findBestSmartMatch(value, context.uiConfig.repositoryConfigs.map(repo => repo.name));
          if (smartMatch && smartMatch.toLowerCase() !== value.toLowerCase()) {
            warnings.push(`Repository "${value}" was matched to "${smartMatch}".`);
          }
          return !smartMatch;
        });
        if (newValues.length > 0) {
          warnings.push(`New repositor${newValues.length === 1 ? 'y will' : 'ies will'} be created: ${newValues.join(', ')}.`);
        }
      }

      if (column.key === 'relevantEnvironments') {
        const invalidValues = splitMultiValue(rawValue).filter(value => {
          const smartMatch = findBestSmartMatch(value, context.uiConfig.environments.map(environment => environment.name));
          if (smartMatch && smartMatch.toLowerCase() !== value.toLowerCase()) {
            warnings.push(`Environment "${value}" was matched to "${smartMatch}".`);
          }
          return !smartMatch;
        });
        if (invalidValues.length > 0) {
          errors.push(`Unknown environments: ${invalidValues.join(', ')}.`);
        }
      }

      if (column.key === 'developers') {
        const newValues = splitMultiValue(rawValue).flatMap(value => {
          const displayValue = getPersonNameById(value, context.developers) || value.trim();
          if (getPersonNameById(value, context.developers)) {
            return [];
          }

          const smartMatch = findBestSmartMatch(displayValue, context.developers.map(person => person.name));
          if (smartMatch && smartMatch.toLowerCase() !== displayValue.toLowerCase()) {
            warnings.push(`Developer "${displayValue}" was matched to "${smartMatch}".`);
          }
          return smartMatch ? [] : [displayValue];
        });
        if (newValues.length > 0) {
          warnings.push(`New developer${newValues.length === 1 ? '' : 's'} will be created: ${newValues.join(', ')}.`);
        }
      }

      if (column.key === 'testers') {
        const newValues = splitMultiValue(rawValue).flatMap(value => {
          const displayValue = getPersonNameById(value, context.testers) || value.trim();
          if (getPersonNameById(value, context.testers)) {
            return [];
          }

          const smartMatch = findBestSmartMatch(displayValue, context.testers.map(person => person.name));
          if (smartMatch && smartMatch.toLowerCase() !== displayValue.toLowerCase()) {
            warnings.push(`Tester "${displayValue}" was matched to "${smartMatch}".`);
          }
          return smartMatch ? [] : [displayValue];
        });
        if (newValues.length > 0) {
          warnings.push(`New tester${newValues.length === 1 ? '' : 's'} will be created: ${newValues.join(', ')}.`);
        }
      }

      if (
        (column.type === 'multiselect' || column.type === 'tags') &&
        column.key !== 'repositories' &&
        column.key !== 'relevantEnvironments'
      ) {
        const availableOptions = (column.options || []).filter(Boolean);
        if (availableOptions.length > 0) {
          const newValues = splitMultiValue(rawValue).filter(value => {
            const smartMatch = findBestSmartMatch(value, availableOptions);
            if (smartMatch && smartMatch.toLowerCase() !== value.toLowerCase()) {
              warnings.push(`${displayName} value "${value}" was matched to "${smartMatch}".`);
            }
            return !smartMatch;
          });

          if (newValues.length > 0) {
            warnings.push(`New ${displayName.toLowerCase()} value${newValues.length === 1 ? '' : 's'} will be added: ${newValues.join(', ')}.`);
          }
        }
      }

      if (column.type === 'url') {
        try {
          const parsed = new URL(trimmedValue);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            errors.push(`${displayName} must start with http:// or https://.`);
          }
        } catch {
          errors.push(`${displayName} must be a valid URL.`);
        }
      }

      if (column.type === 'number' && Number.isNaN(Number(trimmedValue))) {
        errors.push(`${displayName} must be a valid number.`);
      }

      if (column.type === 'date' && !normalizeDateString(trimmedValue)) {
        errors.push(`${displayName} must be a valid date.`);
      }

      if (column.type === 'checkbox' && parseBoolean(trimmedValue) === null) {
        errors.push(`${displayName} must be Yes or No.`);
      }

      if ((column.type === 'select' || column.type === 'multiselect') && column.options?.length) {
        const candidateValues = column.type === 'multiselect' ? splitMultiValue(trimmedValue) : [trimmedValue];
        const invalidValues = candidateValues.filter(value => {
          const smartMatch = findBestSmartMatch(value, column.options || []);
          if (smartMatch && smartMatch.toLowerCase() !== value.toLowerCase()) {
            warnings.push(`${displayName} value "${value}" was matched to "${smartMatch}".`);
          }
          return !smartMatch;
        });
        if (invalidValues.length > 0) {
          errors.push(`${displayName} contains unavailable option values: ${invalidValues.join(', ')}.`);
        }
      }

      if (column.isUnique) {
        const normalizedValue = trimmedValue.toLowerCase();
        const existingValues = existingUniqueValues.get(column.key);
        if (existingValues?.has(normalizedValue)) {
          errors.push(`${displayName} must be unique. "${trimmedValue}" already exists.`);
        }

        if (!fileUniqueValues.has(column.key)) {
          fileUniqueValues.set(column.key, new Map());
        }

        const collisionMap = fileUniqueValues.get(column.key)!;
        const existingRowNumber = collisionMap.get(normalizedValue);
        if (existingRowNumber) {
          errors.push(`${displayName} duplicates row ${existingRowNumber}.`);
        } else {
          collisionMap.set(normalizedValue, rawRow.rowNumber);
        }
      }
    });

    const devStart = normalizedTask.devStartDate ? new Date(normalizedTask.devStartDate).getTime() : null;
    const devEnd = normalizedTask.devEndDate ? new Date(normalizedTask.devEndDate).getTime() : null;
    const qaStart = normalizedTask.qaStartDate ? new Date(normalizedTask.qaStartDate).getTime() : null;
    const qaEnd = normalizedTask.qaEndDate ? new Date(normalizedTask.qaEndDate).getTime() : null;

    if (devStart && devEnd && devEnd < devStart) {
      errors.push('Development end date must be on or after the start date.');
    }

    if (qaStart && qaEnd && qaEnd < qaStart) {
      errors.push('QA end date must be on or after the start date.');
    }

    return {
      id: rawRow.id,
      rowNumber: rawRow.rowNumber,
      values: rawRow.values,
      normalizedTask,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  });
}
