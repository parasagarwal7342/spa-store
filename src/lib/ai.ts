import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
export const aiReady = () => !!process.env.ANTHROPIC_API_KEY;

/**
 * One structured call to Claude. Returns null when AI isn't configured, the request
 * fails, or the model declines, so callers can fall back to a template or a human.
 */
export async function askClaude<T extends z.ZodType>(system: string, prompt: string, schema: T): Promise<z.infer<T> | null> {
  if (!aiReady()) return null;
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
    });
    if (res.stop_reason === 'refusal') return null;
    return (res.parsed_output as z.infer<T> | null) ?? null;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn('Claude rate limited');
    else if (error instanceof Anthropic.APIError) console.error('Claude API error', error.status, error.message);
    else console.error('Claude request failed', error);
    return null;
  }
}

export { z };
