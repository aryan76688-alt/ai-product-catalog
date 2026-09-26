import { AIProvider } from './types';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';

let cachedProvider: AIProvider | null = null;
let currentProviderType: string = '';

export function getAIProvider(explicitProvider?: 'openai' | 'gemini'): AIProvider {
  const providerType = explicitProvider || process.env.AI_PROVIDER || 'openai';

  if (cachedProvider && currentProviderType === providerType) {
    return cachedProvider;
  }

  if (providerType === 'gemini') {
    cachedProvider = new GeminiProvider();
    currentProviderType = 'gemini';
  } else {
    cachedProvider = new OpenAIProvider();
    currentProviderType = 'openai';
  }

  return cachedProvider;
}

export function setRuntimeAIProvider(provider: 'openai' | 'gemini') {
  currentProviderType = provider;
  if (provider === 'gemini') {
    cachedProvider = new GeminiProvider();
  } else {
    cachedProvider = new OpenAIProvider();
  }
}
