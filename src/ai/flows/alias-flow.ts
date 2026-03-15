
'use server';

/**
 * @fileOverview A Genkit flow that generates a concise, human-readable alias for a given URL.
 *
 * This file exports:
 * - getLinkAlias: An asynchronous function that takes a URL and returns a suggested alias.
 * - AliasInput: The input type for the alias generation flow.
 * - AliasOutput: The output type for the alias generation flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AliasInputSchema = z.object({
  url: z.string().url(),
});

const AliasOutputSchema = z.object({
  name: z.string().describe('A short, descriptive alias for the URL.'),
});

export type AliasInput = z.infer<typeof AliasInputSchema>;
export type AliasOutput = z.infer<typeof AliasOutputSchema>;

/**
 * Generates a concise, human-readable alias for a given URL.
 * @param input An object containing the URL to be aliased.
 * @returns A promise that resolves to an object containing the generated alias.
 */
export async function getLinkAlias(
  input: AliasInput
): Promise<AliasOutput> {
  return generateAliasFlow(input);
}

const generateAliasFlow = ai.defineFlow(
  {
    name: 'generateAliasFlow',
    inputSchema: AliasInputSchema,
    outputSchema: AliasOutputSchema,
  },
  async ({ url }) => {
    const { output } = await ai.generate({
      prompt: `Generate a short, human-readable alias for the following URL. The alias should be concise and reflect the content of the page. For example, for a URL like "https://github.com/firebase/genkit/pull/123", a good alias would be "Genkit PR #123".

URL: ${url}`,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: AliasOutputSchema,
      },
      config: {
        temperature: 0.3,
      },
    });

    return output!;
  }
);
