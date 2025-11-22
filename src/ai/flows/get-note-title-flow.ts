'use server';
/**
 * @fileOverview A flow to generate a title for a note from its content.
 *
 * - getNoteTitle - A function that handles title generation.
 * - GetNoteTitleInput - The input type for the getNoteTitle function.
 * - GetNoteTitleOutput - The return type for the getNoteTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetNoteTitleInputSchema = z.object({
  content: z.string().describe('The content of the note.'),
});
export type GetNoteTitleInput = z.infer<typeof GetNoteTitleInputSchema>;

const GetNoteTitleOutputSchema = z.object({
  title: z.string().describe('A short, relevant title for the note.'),
});
export type GetNoteTitleOutput = z.infer<typeof GetNoteTitleOutputSchema>;

export async function getNoteTitle(input: GetNoteTitleInput): Promise<GetNoteTitleOutput> {
  return getNoteTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getNoteTitlePrompt',
  input: {schema: GetNoteTitleInputSchema},
  output: {schema: GetNoteTitleOutputSchema},
  prompt: `Generate a concise, relevant title for the following note content.
The title should be under 8 words and capture the main subject of the note.

Note Content:
{{{content}}}`,
});

const getNoteTitleFlow = ai.defineFlow(
  {
    name: 'getNoteTitleFlow',
    inputSchema: GetNoteTitleInputSchema,
    outputSchema: GetNoteTitleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
