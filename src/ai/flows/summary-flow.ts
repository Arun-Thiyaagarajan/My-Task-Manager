
'use server';
/**
 * @fileOverview A Genkit flow that generates a one-sentence summary for a given block of text.
 *
 * This file exports:
 * - generateSummary: An asynchronous function that takes a text block and returns a summary.
 * - SummaryInput: The input type for the summary generation flow.
 * - SummaryOutput: The output type for the summary generation flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SummaryInputSchema = z.object({
  text: z.string(),
});

const SummaryOutputSchema = z.object({
  summary: z.string().describe('A one-sentence summary of the text.'),
});

export type SummaryInput = z.infer<typeof SummaryInputSchema>;
export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;
export type SummaryGenerationResult =
  | { ok: true; summary: string; attempts: number }
  | { ok: false; reason: string; attempts: number; error?: unknown };

/**
 * Generates a one-sentence summary for a given block of text.
 * @param input An object containing the text to be summarized.
 * @returns A promise that resolves to an object containing the generated summary.
 */
export async function generateSummary(
  input: SummaryInput
): Promise<SummaryOutput> {
  return generateSummaryFlow(input);
}

export async function generateSummarySafely(
  input: SummaryInput,
  options?: { retries?: number }
): Promise<SummaryGenerationResult> {
  const retries = Math.max(0, options?.retries ?? 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await generateSummary(input);
      const summary = result.summary?.trim();

      if (!summary) {
        throw new Error('Summary generation returned an empty response.');
      }

      return {
        ok: true,
        summary,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const reason =
    lastError instanceof Error && lastError.message
      ? lastError.message
      : 'Summary generation failed.';

  return {
    ok: false,
    reason,
    attempts: retries + 1,
    error: lastError,
  };
}

const generateSummaryFlow = ai.defineFlow(
  {
    name: 'generateSummaryFlow',
    inputSchema: SummaryInputSchema,
    outputSchema: SummaryOutputSchema,
  },
  async ({ text }) => {
    const { output } = await ai.generate({
      prompt: `Generate a one-sentence summary of the following text:

${text}`,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: SummaryOutputSchema,
      },
      config: {
        temperature: 0.5,
      },
    });

    return output!;
  }
);
