'use client';

import type { AssistantPlannedAction } from '@/lib/ai-assistant';
import type { AssistantAccessPolicyResult } from './assistant-types';
import { normalize, sanitizeEntityQuery } from './assistant-utils';

export const FUTURE_ENHANCEMENT_MESSAGES = [
  'That prompt is not supported in the assistant yet. I have noted it as a future enhancement and I can still help with tasks, notes, reminders, navigation, and field updates today.',
  'That is not available in the current assistant scope yet. It would be a good future enhancement, and for now I can help with task creation, task updates, note changes, reminders, and navigation.',
  'I cannot complete that workflow through chat yet. It is something we can consider for a future enhancement, while the current assistant focuses on tasks, notes, reminders, and workspace navigation.',
];

export function sanitizeAssistantRuntimeErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('an error occurred in the server components render') ||
    normalized.includes('specific message is omitted in production builds') ||
    normalized.includes('digest property') ||
    normalized.includes('production builds to avoid leaking sensitive details')
  ) {
    return 'The assistant hit a protected server error while processing that request. Please try again. If it keeps happening, try a simpler prompt or continue with shorter details.';
  }
  return message;
}

export function sanitizeAssistantVisibleMessage(message: string) {
  return sanitizeAssistantRuntimeErrorMessage(message);
}

export function evaluateAssistantAccessPolicy(message: string, options: {
  authMode: 'localStorage' | 'authenticate';
  role: 'guest' | 'user' | 'admin';
}): AssistantAccessPolicyResult {
  const normalizedMessage = normalize(message);
  const privacyPatterns = ['who all are using', 'who is using', 'list users', 'show user data', 'their data', 'all user data', 'user emails', 'user email', 'phone number', 'team members', 'developers list', 'testers list', 'workspace users', 'who uses'];
  const authPatterns = ['my account', 'cloud sync', 'sync across devices', 'authenticate', 'sign in', 'login', 'log in'];
  const adminPatterns = ['admin', 'all feedback', 'all notifications', 'workspace analytics', 'usage analytics'];

  if (privacyPatterns.some((pattern) => normalizedMessage.includes(pattern))) {
    if (options.authMode !== 'authenticate') {
      return { status: 'requires_auth', message: 'That kind of people or usage data is not available in guest mode. If you sign in, I can help with account-aware features, but private user and roster data still stays restricted here.', cta: { label: 'Authenticate', mode: 'auth' } };
    }
    return { status: 'restricted', message: 'I can’t expose other users, roster details, or private usage data through the assistant. I can still help with your visible tasks, notes, reminders, navigation, and field updates.' };
  }
  if (authPatterns.some((pattern) => normalizedMessage.includes(pattern)) && options.authMode !== 'authenticate') {
    return { status: 'requires_auth', message: 'This request needs an authenticated account. Sign in to unlock account-aware features and synced workspace access.', cta: { label: 'Authenticate', mode: 'auth' } };
  }
  if (adminPatterns.some((pattern) => normalizedMessage.includes(pattern)) && options.role !== 'admin') {
    if (options.authMode !== 'authenticate') {
      return { status: 'requires_auth', message: 'That area is protected. Sign in first, and keep in mind that admin-only features still stay hidden unless your account has admin access.', cta: { label: 'Authenticate', mode: 'auth' } };
    }
    return { status: 'restricted', message: 'That request is limited to admin access, so I can’t help with it from this account.' };
  }
  return { status: 'allowed' };
}

export function evaluateAssistantActionAccess(action: AssistantPlannedAction, options: {
  authMode: 'localStorage' | 'authenticate';
  role: 'guest' | 'user' | 'admin';
}): AssistantAccessPolicyResult {
  const href = action.href || '';
  const target = `${action.label} ${action.explanation || ''} ${action.targetQuery || ''} ${href}`;
  if (href.startsWith('/admin') || normalize(target).includes('admin')) {
    if (options.authMode !== 'authenticate') {
      return { status: 'requires_auth', message: 'This action is protected. Sign in first, and admin-only features will still remain limited by your account role.', cta: { label: 'Authenticate', mode: 'auth' } };
    }
    if (options.role !== 'admin') {
      return { status: 'restricted', message: 'This action is limited to admin access, so I can’t execute it from this account.' };
    }
  }
  return { status: 'allowed' };
}

export function isAssistantCancelIntent(value: string) {
  const normalizedValue = normalize(value);
  return ['stop', 'cancel', 'cancel it', 'stop it', 'never mind', 'nevermind', 'leave it', 'forget it', 'drop it', 'quit', 'close it']
    .some((phrase) => normalizedValue === phrase || normalizedValue.includes(phrase));
}

export function isGenericAssistantEntityRequest(value: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return true;
  const genericPhrases = new Set(['open', 'show', 'find', 'go to', 'task', 'tasks', 'note', 'notes', 'open task', 'open tasks', 'open note', 'open notes', 'show task', 'show tasks', 'show note', 'show notes']);
  return genericPhrases.has(normalizedValue) || sanitizeEntityQuery(value).length < 2;
}

export function isAssistantPlannerUnavailableMessage(message: string) {
  const normalized = normalize(message);
  return normalized.includes('protected server error while processing that request') ||
    normalized.includes('ai is currently unavailable') ||
    normalized.includes('gemini api key') ||
    normalized.includes('configured gemini model is unavailable') ||
    normalized.includes('assistant unavailable');
}

export function getAssistantCapabilitiesMessage(role: 'guest' | 'user' | 'admin', authMode: 'localStorage' | 'authenticate') {
  const lines = [
    'Here is what I can do right now:',
    '',
    '1. Open tasks or templates by title, close match, or saved preset name.',
    '2. Navigate to pages like tasks, templates, notes, dashboard, reminders, logs, bin, profile, settings, and Excel import.',
    '3. Open filtered task views using status, status group, repository, tags, or search text.',
    '4. Create a new task',
    '5. Update task fields, including active custom fields from your workspace settings.',
    '6. Set or clear task reminders.',
    '7. Create notes and update existing notes.',
    '8. Preview every write first, then wait for your confirmation before changing data.',
  ];
  if (authMode !== 'authenticate') lines.push('', 'Some account-aware or protected workspace requests may ask you to sign in first.');
  if (role !== 'admin') lines.push('', 'Privacy rules apply: I do not expose other users, private roster data, or admin-only workspace details here.');
  lines.push('', 'What I do not handle fully yet:', '- bulk actions through chat', '- imports/exports through chat', '- template creation or template editing through chat', '- autonomous destructive actions');
  return lines.join('\n');
}

export function getFutureEnhancementMessage(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return FUTURE_ENHANCEMENT_MESSAGES[Math.abs(hash) % FUTURE_ENHANCEMENT_MESSAGES.length];
}

export function shouldShowFutureEnhancementFollowUp(message: string) {
  const normalizedMessage = normalize(message);
  if (normalizedMessage.includes('private') || normalizedMessage.includes('privacy') || normalizedMessage.includes('protected') || normalizedMessage.includes('restricted') || normalizedMessage.includes('admin access') || normalizedMessage.includes('sign in') || normalizedMessage.includes('authenticate')) {
    return false;
  }
  return normalizedMessage.includes('not supported') || normalizedMessage.includes('cannot') || normalizedMessage.includes('can’t') || normalizedMessage.includes('unable') || normalizedMessage.includes('not available');
}

export function getSafetyResponse(value: string) {
  const normalizedValue = normalize(value);
  const illegalPatterns = ['hack', 'hacking', 'steal', 'stolen', 'bypass', 'crack', 'pirated', 'piracy', 'malware', 'ransomware', 'exploit', 'weapon', 'bomb', 'fraud', 'scam', 'drugs', 'kill', 'murder'];
  const explicitPatterns = ['porn', 'nude', 'sex', 'sexy', 'fetish', 'nsfw'];
  if (illegalPatterns.some((pattern) => normalizedValue.includes(pattern))) {
    return 'I can’t help with illegal, harmful, or abusive requests. If you want, I can still help with safe task management, notes, reminders, navigation, or product questions inside TaskFlow.';
  }
  if (explicitPatterns.some((pattern) => normalizedValue.includes(pattern))) {
    return 'I can’t help with explicit or inappropriate requests here. I can help with safe workspace actions, feature guidance, planning, notes, and reminders instead.';
  }
  return null;
}

export function getGeneralConversationResponse(value: string) {
  const normalizedValue = normalize(value);
  if (['leave', 'bye', 'goodbye', 'exit', 'close', 'done', 'later', 'talk later'].includes(normalizedValue)) {
    return 'Sure. I’ll stay here whenever you need help with TaskFlow again.';
  }
  if (/^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening|whatsup|whats up)\b/.test(normalizedValue)) {
    return 'Hello. I’m here to help with TaskFlow tasks, notes, reminders, navigation, and feature questions. You can ask me to create something, update a field, or explain how a flow works.';
  }
  if (normalizedValue.includes('how are you')) {
    return 'I’m doing well and ready to help. If you want, tell me what you need in TaskFlow and I’ll guide you step by step or prepare the action for confirmation.';
  }
  if (['thanks', 'thank you', 'ok thanks', 'great thanks'].includes(normalizedValue)) {
    return 'You’re welcome. I’m here whenever you want help with tasks, notes, reminders, navigation, or feature guidance.';
  }
  if (normalizedValue.includes('who are you') || normalizedValue.includes('what are you') || normalizedValue.includes('what do you do')) {
    return 'I’m your TaskFlow desktop assistant. I can help you create and update tasks, manage notes and reminders, open pages or records, and explain how features work inside the app.';
  }
  if (normalizedValue.includes('tell me a joke') || normalizedValue.includes('sing a song') || normalizedValue.includes('write a poem') || normalizedValue.includes('who is the president') || normalizedValue.includes('weather') || normalizedValue.includes('stock price')) {
    return 'I’m staying focused on TaskFlow here. I can still help with workspace actions, explain product flows, guide you step by step, or prepare task, note, and reminder changes for confirmation.';
  }
  return null;
}

export function getLocalHelpResponse(value: string) {
  const normalizedValue = normalize(value);
  if (
    normalizedValue.includes('how to create task') ||
    normalizedValue.includes('how do i create task') ||
    normalizedValue.includes('how to create tasks') ||
    normalizedValue.includes('how do i create tasks')
  ) {
    return [
      'Here are the steps to create a task:',
      '',
      '1. Open the `Tasks` page.',
      '2. Click `New Task`.',
      '3. Enter the task title and description.',
      '4. Choose the status, repositories, assignees, tags, and any other required fields.',
      '5. Add a reminder if needed.',
      '6. Save the task to create it.',
      '',
      'You can also ask me things like `Create a task for QA sign-off tomorrow` and I can prepare it for confirmation here.',
    ].join('\n');
  }
  return null;
}

export function isCapabilitiesPrompt(value: string) {
  const normalizedValue = normalize(value);
  return normalizedValue.includes('what can you do') ||
    normalizedValue.includes('what all can you do') ||
    normalizedValue.includes('show features') ||
    normalizedValue.includes('list features') ||
    normalizedValue.includes('help me with prompts') ||
    normalizedValue.includes('what prompts') ||
    normalizedValue.includes('assistant features') ||
    normalizedValue.includes('capabilities');
}

export function formatAssistantContent(value: string) {
  return value.replace(/:\s*(\d+\.)/g, ':\n\n$1').replace(/(\d+\.)\s+/g, '\n$1 ').replace(/\n{3,}/g, '\n\n').trim();
}
