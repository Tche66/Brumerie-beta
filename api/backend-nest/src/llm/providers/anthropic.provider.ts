import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider, LlmCallParams } from '../llm-provider.interface';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  }

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async call(params: LlmCallParams): Promise<string> {
    const { system, messages, maxTokens = 1500 } = params;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: messages as any,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}
