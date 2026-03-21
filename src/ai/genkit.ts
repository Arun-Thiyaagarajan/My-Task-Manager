import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit instance initialized with the modern Google AI plugin.
 * This instance is used to define and execute AI flows across the application.
 */
export const ai = genkit({
  plugins: [
    googleAI()
  ],
});
