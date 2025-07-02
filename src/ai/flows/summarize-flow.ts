'use server';
/**
 * @fileOverview A flow to summarize text.
 *
 * - summarizeText - A function that handles text summarization.
 * - SummarizeInput - The input type for the summarizeText function.
 * - SummarizeOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInputSchema = z.object({
  textToSummarize: z.string().describe('The text to be summarized.'),
});
export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

const SummarizeOutputSchema = z.object({
  summary: z.string().describe('The summarized text.'),
});
export type SummarizeOutput = z.infer<typeof SummarizeOutputSchema>;

export async function summarizeText(input: SummarizeInput): Promise<SummarizeOutput> {
  return summarizeTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeInputSchema},
  output: {schema: SummarizeOutputSchema},
  prompt: `Summarize the following text into a short and sweet, one-sentence summary. Keep it concise and under 150 characters.

Text to summarize:
{{{textToSummarize}}}`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeInputSchema,
    outputSchema: SummarizeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
