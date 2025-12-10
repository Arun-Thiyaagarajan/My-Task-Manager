
'use server';
/**
 * @fileOverview A Genkit flow that generates a one-sentence summary for a given block of text.
 *
 * This file exports:
 * - generateSummary: An asynchronous function that takes a text block and returns a summary.
 * - SummaryInputSchema: The Zod schema for the input to the summary generation flow.
 * - SummaryOutputSchema: The Zod schema for the output of the summary generation flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const SummaryInputSchema = z.object({
  text: z.string(),
});

export const SummaryOutputSchema = z.object({
  summary: z.string().describe('A one-sentence summary of the text.'),
});

/**
 * Generates a one-sentence summary for a given block of text.
 * @param input An object containing the text to be summarized.
 * @returns A promise that resolves to an object containing the generated summary.
 */
export async function generateSummary(
  input: z.infer<typeof SummaryInputSchema>
): Promise<z.infer<typeof SummaryOutputSchema>> {
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
