'use server';

/**
 * @fileOverview A Genkit flow that refines and rephrases a given block of text.
 *
 * This file exports:
 * - refineText: An asynchronous function that takes a text block and returns a refined version.
 * - RefineInput: The input type for the refine flow.
 * - RefineOutput: The output type for the refine flow.
 */

import { ai } from '@/ai/genkit';
import { DEFAULT_GEMINI_MODEL, ensureAiAvailable, getAiErrorMessage } from '@/ai/availability';
import { z } from 'zod';

const RefineInputSchema = z.object({
  text: z.string().describe('The text to be refined or rephrased.'),
  contextBefore: z.string().optional().describe('Optional surrounding text that appears before the selected text.'),
  contextAfter: z.string().optional().describe('Optional surrounding text that appears after the selected text.'),
});

const RefineOutputSchema = z.object({
  refinedText: z.string().describe('The improved, rephrased, or refined version of the input text.'),
});

export type RefineInput = z.infer<typeof RefineInputSchema>;
export type RefineOutput = z.infer<typeof RefineOutputSchema>;

/**
 * Refines and rephrases a given block of text using AI.
 * @param input An object containing the text to be refined.
 * @returns A promise that resolves to an object containing the refined text.
 */
export async function refineText(
  input: RefineInput
): Promise<RefineOutput> {
  try {
    ensureAiAvailable();
    return await refineTextFlow(input);
  } catch (error) {
    console.error("AI Refine Flow Error:", error);
    throw new Error(getAiErrorMessage(error));
  }
}

const refineTextFlow = ai.defineFlow(
  {
    name: 'refineTextFlow',
    inputSchema: RefineInputSchema,
    outputSchema: RefineOutputSchema,
  },
  async ({ text, contextBefore, contextAfter }) => {
    const { output } = await ai.generate({
      prompt: `You are a professional editor and productivity assistant. 
      Your task is to refine and rephrase the following text to improve clarity, fix grammar, and make it more professional or concise while maintaining the original intent.
      
      Important Instructions:
      - Preserve the original structure and formatting. Keep paragraphs, bullet lists, numbered lists, line breaks, markdown markers, links, mentions, and code fences intact unless a tiny wording change inside the same structure is required.
      - If the text contains code blocks (wrapped in \` or \`\`\`), preserve them exactly as they are.
      - If the text is only a selected portion of a larger message, make the refined output fit naturally with the surrounding context.
      - If the text looks like a task title, make it punchy and action-oriented.
      - If the text looks like a description, ensure it follows a logical structure.
      - Do not add any conversational filler (e.g., "Here is the refined text:"). Only provide the refined content.
      - Return only the refined replacement text for the provided input segment.

      Surrounding context before the text:
      ${contextBefore || '(none)'}

      Surrounding context after the text:
      ${contextAfter || '(none)'}

      Text to refine:
      ${text}`,
      model: DEFAULT_GEMINI_MODEL,
      output: {
        schema: RefineOutputSchema,
      },
      config: {
        temperature: 0.4,
      },
    });

    if (!output) {
        throw new Error("AI failed to generate a response.");
    }

    return output;
  }
);
