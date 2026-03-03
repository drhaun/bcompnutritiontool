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
 * Convenience: call aiChat and parse the result as JSON.
 * Handles markdown code fences and extracts the first JSON object.
 */
export async function aiChatJSON<T = unknown>(options: AIChatOptions): Promise<T> {
  const raw = await aiChat({ ...options, jsonMode: true });
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1].trim() : raw.trim();
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error('AI response did not contain valid JSON');
  return JSON.parse(objMatch[0]) as T;
}
