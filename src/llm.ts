import { OpenAI } from 'openai';
import { workspace } from 'vscode';

export class LLM {
  apiEndpoint = 'http://localhost:5001/v1';
  client: OpenAI;

  constructor() {
    this.apiEndpoint = workspace
      .getConfiguration('multicompletion')
      .get('active_endpoint', this.apiEndpoint);

    this.client = new OpenAI({
      apiKey: 'NONE',
      baseURL: this.apiEndpoint,
    });
  }

  async getCompletion(
    prompt: string,
    stop: string[] = [],
    temp: number | null = null,
    maxTokens: number | null = null
  ) {
    return await this.client.completions.create({
      model: 'NONE',
      prompt,
      stream: true,
      temperature:
        temp ||
        workspace.getConfiguration('multicompletion').get('temperature'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      max_tokens:
        maxTokens ||
        workspace.getConfiguration('multicompletion').get('max_tokens'),
      stop: [
        ...stop,
        ...workspace
          .getConfiguration('multicompletion')
          .get('stop_sequences', []),
      ],
    });
  }

  async getInstruct(
    system: string,
    prompt: string,
    stop: string[] = [],
    temp: number | null = null,
    maxTokens: number | null = null
  ) {
    return await this.client.chat.completions.create({
      model: 'NONE',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      stream: true,
      temperature:
        temp ||
        workspace.getConfiguration('multicompletion').get('temperature'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      max_tokens:
        maxTokens ||
        workspace.getConfiguration('multicompletion').get('max_tokens'),
      stop: [
        ...stop,
        ...workspace
          .getConfiguration('multicompletion')
          .get('stop_sequences', []),
      ],
    });
  }
}
