'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting related tasks based on a task description or linked PRs.
 *
 * - suggestRelatedTasks - A function that suggests related tasks.
 * - SuggestRelatedTasksInput - The input type for the suggestRelatedTasks function.
 * - SuggestRelatedTasksOutput - The output type for the suggestRelatedTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelatedTasksInputSchema = z.object({
  description: z.string().describe('The description of the task.'),
  prLinks: z.array(z.string()).describe('An array of pull request links associated with the task.'),
});
export type SuggestRelatedTasksInput = z.infer<typeof SuggestRelatedTasksInputSchema>;

const SuggestRelatedTasksOutputSchema = z.array(z.string()).describe('An array of suggested related tasks.');
export type SuggestRelatedTasksOutput = z.infer<typeof SuggestRelatedTasksOutputSchema>;

export async function suggestRelatedTasks(input: SuggestRelatedTasksInput): Promise<SuggestRelatedTasksOutput> {
  return suggestRelatedTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelatedTasksPrompt',
  input: {schema: SuggestRelatedTasksInputSchema},
  output: {schema: SuggestRelatedTasksOutputSchema},
  prompt: `You are a project manager tasked with identifying related tasks.
  Based on the following task description and associated pull requests, suggest a list of related tasks that might need to be addressed.
  Return the tasks as a JSON array.

  Task Description: {{{description}}}
  Pull Requests: {{#each prLinks}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  `,
});

const suggestRelatedTasksFlow = ai.defineFlow(
  {
    name: 'suggestRelatedTasksFlow',
    inputSchema: SuggestRelatedTasksInputSchema,
    outputSchema: SuggestRelatedTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
