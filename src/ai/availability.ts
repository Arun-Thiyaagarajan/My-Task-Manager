export const DEFAULT_GEMINI_MODEL = 'googleai/gemini-2.5-flash';
export const AI_UNAVAILABLE_MESSAGE = 'AI is currently unavailable. Please check the Gemini configuration and try again later.';
export const AI_SETUP_MESSAGE = 'To use the AI assistant, set a valid GEMINI_API_KEY locally and in your deployed environment, then restart the app.';

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function ensureAiAvailable() {
  if (!isAiConfigured()) {
    throw new Error('AI is unavailable because GEMINI_API_KEY is not configured.');
  }
}

export function getAiErrorMessage(error: unknown) {
  if (!isAiConfigured()) {
    return `AI is unavailable because the Gemini API key is not configured. ${AI_SETUP_MESSAGE}`;
  }

  if (error instanceof Error) {
    const message = error.message?.trim();
    if (!message) return AI_UNAVAILABLE_MESSAGE;

    const normalized = message.toLowerCase();
    if (
      normalized.includes('404') ||
      normalized.includes('not found') ||
      normalized.includes('model') && normalized.includes('generatecontent')
    ) {
      return `The configured Gemini model is unavailable for this API version. The app should use a current supported model like "${DEFAULT_GEMINI_MODEL.replace('googleai/', '')}". ${AI_SETUP_MESSAGE}`;
    }
    if (
      normalized.includes('api key') ||
      normalized.includes('permission') ||
      normalized.includes('quota') ||
      normalized.includes('unavailable') ||
      normalized.includes('overloaded') ||
      normalized.includes('deadline') ||
      normalized.includes('503')
    ) {
      return AI_UNAVAILABLE_MESSAGE;
    }

    return message;
  }

  return AI_UNAVAILABLE_MESSAGE;
}

export function getAiAvailabilityState() {
  if (!isAiConfigured()) {
    return {
      available: false,
      reason: `Gemini API key is not configured. ${AI_SETUP_MESSAGE}`,
    };
  }

  return {
    available: true,
    reason: '',
  };
}
