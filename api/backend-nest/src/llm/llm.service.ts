import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider, LlmCallParams } from './llm-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { BedrockProvider } from './providers/bedrock.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Injectable()
export class LlmService {
  private providers: Map<string, LlmProvider> = new Map();
  private activeProvider: LlmProvider;
  private fallbackProvider: LlmProvider | null = null;
  private readonly logger = new Logger(LlmService.name);

  constructor() {
    const anthropic = new AnthropicProvider();
    const bedrock = new BedrockProvider();
    const gemini = new GeminiProvider();

    if (anthropic.isConfigured()) this.providers.set('anthropic', anthropic);
    if (bedrock.isConfigured()) this.providers.set('bedrock', bedrock);
    if (gemini.isConfigured()) this.providers.set('gemini', gemini);

    const preferred = process.env.LLM_PROVIDER || 'auto';
    this.activeProvider = this.resolveProvider(preferred);
    this.fallbackProvider = this.resolveFallback(this.activeProvider.name);

    this.logger.log(`LLM active: ${this.activeProvider.name}${this.fallbackProvider ? `, fallback: ${this.fallbackProvider.name}` : ''}`);
  }

  private resolveProvider(preferred: string): LlmProvider {
    if (preferred !== 'auto' && this.providers.has(preferred)) {
      return this.providers.get(preferred)!;
    }

    const priority = ['bedrock', 'anthropic', 'gemini'];
    for (const name of priority) {
      if (this.providers.has(name)) return this.providers.get(name)!;
    }

    throw new Error('Brume IA: aucun provider LLM configuré. Définir ANTHROPIC_API_KEY, AWS credentials, ou GEMINI_API_KEY.');
  }

  private resolveFallback(activeName: string): LlmProvider | null {
    for (const [name, provider] of this.providers) {
      if (name !== activeName) return provider;
    }
    return null;
  }

  async call(params: LlmCallParams): Promise<string> {
    try {
      return await this.activeProvider.call(params);
    } catch (error: any) {
      this.logger.warn(`Provider ${this.activeProvider.name} failed: ${error.message}`);

      if (this.fallbackProvider) {
        this.logger.log(`Switching to fallback: ${this.fallbackProvider.name}`);
        return await this.fallbackProvider.call(params);
      }

      throw error;
    }
  }

  getActiveProviderName(): string {
    return this.activeProvider.name;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
