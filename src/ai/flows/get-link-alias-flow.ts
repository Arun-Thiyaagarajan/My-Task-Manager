'use server';
/**
 * @fileOverview A flow to generate a short alias for a URL.
 *
 * - getLinkAlias - A function that handles URL alias generation.
 * - GetLinkAliasInput - The input type for the getLinkAlias function.
 * - GetLinkAliasOutput - The return type for the getLinkAlias function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetLinkAliasInputSchema = z.object({
  url: z.string().url().describe('The URL to generate an alias for.'),
});
export type GetLinkAliasInput = z.infer<typeof GetLinkAliasInputSchema>;

const GetLinkAliasOutputSchema = z.object({
  alias: z.string().describe('A short, human-readable alias for the URL.'),
});
export type GetLinkAliasOutput = z.infer<typeof GetLinkAliasOutputSchema>;

export async function getLinkAlias(input: GetLinkAliasInput): Promise<GetLinkAliasOutput> {
  return getLinkAliasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getLinkAliasPrompt',
  input: {schema: GetLinkAliasInputSchema},
  output: {schema: GetLinkAliasOutputSchema},
  prompt: `Generate a concise, human-readable alias for the following URL.
Examples:
- For a Google Doc, maybe use "Q3 Planning Doc".
- For a Notion page, use its title like "Project Brief".
- For a Google Sheet, you can just call it "Spreadsheet" or use its title if available.
Keep the alias under 5 words.

URL: {{{url}}}`,
});

const getLinkAliasFlow = ai.defineFlow(
  {
    name: 'getLinkAliasFlow',
    inputSchema: GetLinkAliasInputSchema,
    outputSchema: GetLinkAliasOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
