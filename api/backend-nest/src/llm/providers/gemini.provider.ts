import { LlmProvider, LlmCallParams, LlmContentBlock } from '../llm-provider.interface';

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async call(params: LlmCallParams): Promise<string> {
    const { system, messages, maxTokens = 1500 } = params;

    const contents = this.convertMessages(messages);

    const body = {
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    };

    const models = [this.model, 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    const tried = new Set<string>();

    for (const model of models) {
      if (tried.has(model)) continue;
      tried.add(model);

      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return this.cleanResponse(raw);
      }

      const status = response.status;
      if (status === 404 || status === 400) continue;

      const error = await response.text();
      throw new Error(`Gemini API error (${status}): ${error}`);
    }

    throw new Error('Gemini: aucun modèle disponible');
  }

  private cleanResponse(text: string): string {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    if (text.startsWith('```')) {
      return text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    }
    return text;
  }

  private convertMessages(messages: LlmCallParams['messages']) {
    return messages.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';

      if (typeof msg.content === 'string') {
        return { role, parts: [{ text: msg.content }] };
      }

      const parts = (msg.content as LlmContentBlock[]).map((block) => {
        if (block.type === 'text') {
          return { text: block.text };
        }
        if (block.type === 'image' && block.source?.url) {
          return {
            fileData: {
              mimeType: 'image/jpeg',
              fileUri: block.source.url,
            },
          };
        }
        return { text: '' };
      });

      return { role, parts };
    });
  }
}
