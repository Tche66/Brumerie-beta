export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
}

export interface LlmContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: { type: 'url' | 'base64'; url?: string; data?: string; mediaType?: string };
}

export interface LlmCallParams {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  call(params: LlmCallParams): Promise<string>;
  isConfigured(): boolean;
}
