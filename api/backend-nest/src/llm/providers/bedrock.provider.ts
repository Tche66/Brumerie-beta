import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { LlmProvider, LlmCallParams } from '../llm-provider.interface';

export class BedrockProvider implements LlmProvider {
  readonly name = 'bedrock';
  private client: BedrockRuntimeClient;
  private model: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.model = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-4-6-v1:0';
  }

  isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }

  async call(params: LlmCallParams): Promise<string> {
    const { system, messages, maxTokens = 1500 } = params;

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system,
      messages,
    });

    const command = new InvokeModelCommand({
      modelId: this.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await this.client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.content?.[0]?.text || '';
  }
}
