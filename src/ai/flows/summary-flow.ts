
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
      model: 'googleai/gemini-1.5-flash-latest',
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
