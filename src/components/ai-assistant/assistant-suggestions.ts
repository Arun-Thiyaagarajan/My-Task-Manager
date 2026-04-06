'use client';

import type {
  AssistantChatSession,
  PromptSuggestion,
} from './assistant-types';
import {
  normalize,
} from './assistant-utils';
import {
  formatAssistantContent,
  getGeneralConversationResponse,
  getLocalHelpResponse,
  getSafetyResponse,
  isCapabilitiesPrompt,
} from './assistant-policy';
import { fuzzySearch } from '@/lib/utils';

export const VETTED_ASSISTANT_PROMPTS = [
  'What can you do?',
  'How do I create a task?',
  'Open dashboard',
  'Open templates',
  'Open reminders',
  'Create a note',
  'Create a task',
  'Show me the logs page',
];

export function isPromptSuggestionCandidate(value: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue || normalizedValue.length < 6) return false;
  if (getSafetyResponse(normalizedValue) || getGeneralConversationResponse(normalizedValue)) return false;
  if (isCapabilitiesPrompt(normalizedValue) || getLocalHelpResponse(normalizedValue)) return false;
  return true;
}

export function isAssistantErrorLikeMessage(value: string) {
  const normalizedValue = normalize(formatAssistantContent(value));
  return (
    normalizedValue.includes('protected server error') ||
    normalizedValue.includes('assistant unavailable') ||
    normalizedValue.includes('ai unavailable') ||
    normalizedValue.includes('could not find') ||
    normalizedValue.includes('please be more specific') ||
    normalizedValue.includes('not supported') ||
    normalizedValue.includes('not available here') ||
    normalizedValue.includes('restricted') ||
    normalizedValue.includes('sign in') ||
    normalizedValue.includes('authenticate') ||
    normalizedValue.includes('something went wrong') ||
    normalizedValue.includes('failed') ||
    normalizedValue.includes('error')
  );
}

export function getSuccessfulHistoryPrompts(sessions: AssistantChatSession[]) {
  const successfulPrompts: string[] = [];

  for (const session of sessions) {
    for (let index = 0; index < session.messages.length; index += 1) {
      const message = session.messages[index];
      if (message.role !== 'user') continue;

      const nextAssistantMessage = session.messages
        .slice(index + 1)
        .find((candidate) => candidate.role === 'assistant');

      const prompt = message.content.trim();
      if (!isPromptSuggestionCandidate(prompt)) continue;
      if (!nextAssistantMessage) continue;
      if (isAssistantErrorLikeMessage(nextAssistantMessage.content)) continue;

      successfulPrompts.push(prompt);
    }
  }

  return Array.from(new Set(successfulPrompts));
}

export function shufflePromptSuggestions<T>(items: T[], seed: string) {
  const nextItems = [...items];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    hash = (hash * 1103515245 + 12345) | 0;
    const swapIndex = Math.abs(hash) % (index + 1);
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }
  return nextItems;
}

export function getPromptSuggestionMatches(input: string, sessions: AssistantChatSession[]): PromptSuggestion[] {
  const normalizedInput = normalize(input);
  if (normalizedInput.length < 2) return [];

  const historyPrompts = getSuccessfulHistoryPrompts(sessions);
  const vettedPrompts = VETTED_ASSISTANT_PROMPTS.filter((prompt) => isPromptSuggestionCandidate(prompt));

  const pool = [
    ...historyPrompts.map((text) => ({ id: `history-${text}`, text, source: 'history' as const })),
    ...vettedPrompts.map((text) => ({ id: `suggested-${text}`, text, source: 'suggested' as const })),
  ];

  const scored = pool
    .map((item) => {
      const normalizedText = normalize(item.text);
      let score = 48;

      if (normalizedText === normalizedInput) score += 500;
      if (normalizedText.startsWith(normalizedInput)) score += 280;
      if (normalizedText.includes(normalizedInput)) score += 200;
      if (fuzzySearch(normalizedInput, normalizedText)) score += 120;

      const inputTokens = normalizedInput.split(/\s+/).filter(Boolean);
      const textTokens = new Set(normalizedText.split(/\s+/).filter(Boolean));
      score += inputTokens.reduce((sum, token) => sum + (textTokens.has(token) ? 45 : 0), 0);

      return { ...item, score };
    })
    .filter((item) => item.score > 125)
    .sort((left, right) => right.score - left.score || left.text.length - right.text.length);

  const strongestMatches = scored.filter((item) => item.score >= 260).slice(0, 6);
  const fallbackMatches = scored.filter((item) => item.score < 260).slice(0, 8);
  const selected = [
    ...shufflePromptSuggestions(strongestMatches, `${normalizedInput}-strong`).slice(0, 3),
    ...shufflePromptSuggestions(fallbackMatches, `${normalizedInput}-fallback`).slice(0, 2),
  ].slice(0, 4);

  return selected.map(({ id, text, source }) => ({ id, text, source }));
}

export function getAssistantStarterPrompts(sessions: AssistantChatSession[], seed: string) {
  const historyPrompts = getSuccessfulHistoryPrompts(sessions).map((text) => ({
    id: `starter-history-${text}`,
    text,
    source: 'history' as const,
  }));
  const vettedPrompts = VETTED_ASSISTANT_PROMPTS.map((text) => ({
    id: `starter-vetted-${text}`,
    text,
    source: 'suggested' as const,
  }));

  const uniqueHistory = historyPrompts.slice(0, 8);
  const mixed = [
    ...shufflePromptSuggestions(uniqueHistory, `${seed}-history`).slice(0, 2),
    ...shufflePromptSuggestions(vettedPrompts, `${seed}-vetted`).slice(0, 4),
  ];

  const deduped = Array.from(
    new Map(mixed.map((item) => [normalize(item.text), item])).values()
  );

  return shufflePromptSuggestions(deduped, `${seed}-final`).slice(0, 4);
}

