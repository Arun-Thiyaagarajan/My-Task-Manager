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
import { z } from 'zod';

const RefineInputSchema = z.object({
  text: z.string().describe('The text to be refined or rephrased.'),
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
    return await refineTextFlow(input);
  } catch (error) {
    console.error("AI Refine Flow Error:", error);
    throw new Error("AI refinement is currently unavailable. Please try again later.");
  }
}

const refineTextFlow = ai.defineFlow(
  {
    name: 'refineTextFlow',
    inputSchema: RefineInputSchema,
    outputSchema: RefineOutputSchema,
  },
  async ({ text }) => {
    const { output } = await ai.generate({
      prompt: `You are a professional editor and productivity assistant. 
      Your task is to refine and rephrase the following text to improve clarity, fix grammar, and make it more professional or concise while maintaining the original intent.
      
      Important Instructions:
      - If the text contains code blocks (wrapped in \` or \`\`\`), preserve them exactly as they are.
      - If the text looks like a task title, make it punchy and action-oriented.
      - If the text looks like a description, ensure it follows a logical structure.
      - Do not add any conversational filler (e.g., "Here is the refined text:"). Only provide the refined content.

      Text to refine:
      ${text}`,
      model: 'googleai/gemini-1.5-flash',
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
