/**
 * Unified AI client — prefers Claude (Anthropic) when ANTHROPIC_API_KEY is set,
 * falls back to OpenAI when OPENAI_API_KEY is set.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AITier = 'standard' | 'fast';

export interface AIChatOptions {
  system: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** 'standard' maps to gpt-4o / claude-sonnet-4-20250514, 'fast' maps to gpt-4o-mini / claude-3-5-haiku */
  tier?: AITier;
}

const ANTHROPIC_MODELS: Record<AITier, string> = {
  standard: 'claude-opus-4-6',
  fast: 'claude-opus-4-6',
};

const OPENAI_MODELS: Record<AITier, string> = {
  standard: 'gpt-4o',
  fast: 'gpt-4o-mini',
};

export function getActiveProvider(): 'anthropic' | 'openai' | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

async function callAnthropic(options: AIChatOptions): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tier = options.tier ?? 'fast';

  const response = await client.messages.create({
    model: ANTHROPIC_MODELS[tier],
    max_tokens: options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.7,
    system: options.system,
    messages: [{ role: 'user', content: options.userMessage }],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

async function callOpenAI(options: AIChatOptions): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const tier = options.tier ?? 'fast';

  const response = await client.chat.completions.create({
    model: OPENAI_MODELS[tier],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.userMessage },
    ],
    ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  });

  return response.choices[0]?.message?.content ?? '';
}

/**
 * Send a chat completion request to the configured AI provider.
 * Throws if neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set.
 */
export async function aiChat(options: AIChatOptions): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) {
    throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
  }
  return provider === 'anthropic' ? callAnthropic(options) : callOpenAI(options);
}

/**
 * Attempt to repair common AI JSON mistakes before parsing.
 */
function repairJSON(str: string): string {
  let s = str;
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Remove single-line comments
  s = s.replace(/\/\/[^\n]*/g, '');
  // Replace single-quoted strings with double-quoted (simple heuristic)
  s = s.replace(/(?<=[:,\[{]\s*)'([^']*?)'/g, '"$1"');
  // Fix unescaped newlines inside string values
  s = s.replace(/"([^"]*?)(\n)([^"]*?)"/g, (_, a, __, b) => `"${a}\\n${b}"`);
  return s;
}

/**
 * Try to close truncated JSON by balancing braces/brackets.
 */
function closeTruncatedJSON(str: string): string {
  let braces = 0, brackets = 0;
  let inString = false, escape = false;
  for (const ch of str) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  // If we're inside a string (odd quotes), close it
  if (inString) str += '"';
  // Remove a possible trailing partial key/value
  str = str.replace(/,\s*"[^"]*"?\s*:?\s*$/, '');
  str = str.replace(/,\s*$/, '');
  while (brackets > 0) { str += ']'; brackets--; }
  while (braces > 0) { str += '}'; braces--; }
  return str;
}

/**
 * Convenience: call aiChat and parse the result as JSON.
 * Handles markdown code fences, repairs common AI JSON errors,
 * closes truncated responses, and retries once on failure.
 */
export async function aiChatJSON<T = unknown>(options: AIChatOptions): Promise<T> {
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const raw = await aiChat({ ...options, jsonMode: true });
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = fenced ? fenced[1].trim() : raw.trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!objMatch) {
      if (attempt < MAX_ATTEMPTS) continue;
      throw new Error('AI response did not contain valid JSON');
    }

    let candidate = objMatch[0];

    // Try parsing as-is first
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try with repairs
    }

    // Attempt repair
    candidate = repairJSON(candidate);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try closing truncated JSON
    }

    // Attempt closing truncated response
    candidate = closeTruncatedJSON(candidate);
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`AI JSON parse failed (attempt ${attempt}), retrying...`, e instanceof Error ? e.message : e);
        continue;
      }
      console.error('AI JSON parse failed after all attempts. Raw response (first 500 chars):', raw.slice(0, 500));
      throw new Error(`AI returned malformed JSON: ${e instanceof Error ? e.message : 'parse error'}`);
    }
  }

  throw new Error('AI JSON parse exhausted all attempts');
}
