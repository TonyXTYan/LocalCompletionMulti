import {
  InlineCompletionContext,
  InlineCompletionItem,
  InlineCompletionItemProvider,
  InlineCompletionList,
  TextDocument,
  Position,
  CancellationToken,
  ProviderResult,
  Range,
  workspace,
  InlineCompletionTriggerKind,
  window,
  CancellationTokenSource,
} from 'vscode';

import { OpenAI } from 'openai';
import { Stream } from 'openai/streaming';
import { CodeCompletions, PromptBuilder } from './data';
import { trimLines, countLines, trimSpacesEnd } from './utility';
import { CompletionStatusBarItem } from './ui/status_bar_item';

export class LLMCompletionProvider implements InlineCompletionItemProvider {
  apiEndpoint = 'http://localhost:5001/v1';
  models: Array<{ model: string; onSecondOrMoreCompute?: any }> = [];
  maxGen = 100;
  timeoutCut = 600000; // 600 seconds
  enabled = true;

  //@ts-ignore
  client: OpenAI;
  onGoingStream: Stream<OpenAI.Completions.Completion> | undefined;
  hasOnGoingStream = false;

  lastResponses: CodeCompletions;
  statusBarItem: CompletionStatusBarItem;

  private static _instance: LLMCompletionProvider;

  private currentRequestToken: CancellationTokenSource | null = null;

  /** Get singleton instance of this class */
  static instance() {
    if (!LLMCompletionProvider._instance) {
      throw Error(
        'Tried to access LLMCompletionProvider Instance before building'
      );
    }

    return LLMCompletionProvider._instance;
  }

  /** Build a new instance of this class */
  static build() {
    LLMCompletionProvider._instance = new LLMCompletionProvider();
    return LLMCompletionProvider._instance;
  }

  constructor() {
    this.updateSettings();
    this.lastResponses = new CodeCompletions();
    this.statusBarItem = new CompletionStatusBarItem();
  }

  /** Update variables which depend on extension settings. Should be called if the settings are changed */
  updateSettings() {
    console.log('Updating settings...');
    this.enabled = workspace
      .getConfiguration('editor')
      .get('inlineSuggest.enabled', true);
    this.apiEndpoint = workspace
      .getConfiguration('multicompletion')
      .get('active_endpoint', this.apiEndpoint);

    console.log(`Settings updated: enabled=${this.enabled}, apiEndpoint=${this.apiEndpoint}`);
    this.client = new OpenAI({
      apiKey: workspace.getConfiguration('multicompletion').get('api_key', 'NONE'),
      baseURL: this.apiEndpoint,
    });
  }

  /** Async sleep */
  async completionTimeout(): Promise<unknown> {
    const ms = workspace
      .getConfiguration('multicompletion')
      .get('completion_timeout', 0);

    if (ms <= 0) {
      return 0;
    }

    return await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Execute completion */
  public async getCompletion(prompt: string, stop: string[] = []): Promise<Stream<OpenAI.Completions.Completion>> {
    return await this.client.completions.create({
      model: this.models[0]?.model || 'NONE', // Set the model dynamically
      prompt,
      stream: true,
      temperature: workspace
        .getConfiguration('multicompletion')
        .get('temperature'),
      max_tokens: workspace
        .getConfiguration('multicompletion')
        .get('max_tokens'),
      stop: [
        '\n\n\n',
        ...stop,
        ...workspace
          .getConfiguration('multicompletion')
          .get('stop_sequences', []),
      ],
    }) as Stream<OpenAI.Completions.Completion>;
  }

  /** Check if inline completion should be skipped */
  private shouldSkip(
    prompt: string,
    context: InlineCompletionContext,
    reduceCalls: boolean
  ) {
    // Skip if autocomplete widget is visible
    if (
      context.selectedCompletionInfo !== undefined &&
      workspace
        .getConfiguration('multicompletion')
        .get('skip_autocomplete_widget')
    ) {
      console.debug('Skip completion because Autocomplete widget is visible');
      console.debug(
        workspace
          .getConfiguration('multicompletion')
          .get('skip_autocomplete_widget')
      );
      return true;
    }

    // Remove the condition that checks for specific symbols
    // Always allow autocomplete to trigger
    return false; // Always return false to allow completion
  }

  /** Check if inline completion should be stopped */
  private shouldStop(
    response: string,
    maxLines: number
  ): { shouldStop: boolean; trimmedResponse: string } {
    if (countLines(response, true) <= maxLines) {
      return { shouldStop: false, trimmedResponse: '' };
    }

    const trimmedResponse = trimLines(response, maxLines);
    return { shouldStop: true, trimmedResponse };
  }

  /** Public method to trigger cancellation */
  public triggerCancellation() {
    this.stopOngoingStream();
  }

  /** Stop running LLM completion */
  private stopOngoingStream() {
    if (this.currentRequestToken) {
      this.currentRequestToken.cancel();
      this.currentRequestToken = null; // Reset the token after cancellation
    }
    this.hasOnGoingStream = false;
  }

  /**
   * Analyze document and generate prompt, lineEnding (as stop sequence) and check if single line completion should be used
   */
  analyzeDocument(
    document: TextDocument,
    position: Position
  ): [string, string | null, boolean] {
    const prompt = document.getText(
      new Range(0, 0, position.line, position.character)
    );
    let lineEnding: string | null = document.getText(
      new Range(position.line, position.character, position.line, Infinity)
    );

    // Check line ending for only '' or '\n' to trigger inline completion
    const isSingleLineCompletion = lineEnding?.trim() !== '';

    if (!isSingleLineCompletion) {
      lineEnding = document.getText(
        new Range(position.line + 1, 0, position.line + 1, Infinity)
      );
    }

    lineEnding = lineEnding === '' ? null : lineEnding;

    return [prompt, lineEnding, isSingleLineCompletion];
  }

  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    context: InlineCompletionContext,
    token: CancellationToken
): Promise<InlineCompletionItem[] | InlineCompletionList | null | undefined> {
    // Cancel the previous request if it exists
    this.stopOngoingStream(); // Cancel any ongoing requests

    // Create a new cancellation token for the current request
    this.currentRequestToken = new CancellationTokenSource();

    // Set the flag to indicate an ongoing stream only after a new request is initiated
    this.hasOnGoingStream = true; // Set the flag to indicate an ongoing stream
    console.log('New request initiated, ongoing stream set to true');

    // Check if the user is typing to request new completions
    const isUserTyping = context.triggerKind === InlineCompletionTriggerKind.Automatic;
    if (isUserTyping) {
        // Always request new completions based on user input
        const previousResponses = this.lastResponses.get(document.uri.toString());
        if (previousResponses) {
            return new InlineCompletionList(
                previousResponses.map(
                    (res) =>
                        new InlineCompletionItem(
                            res,
                            new Range(position.line, 0, position.line, position.character)
                        )
                )
            );
        }

        // Request new completions immediately after typing
        const prompt = document.getText(new Range(0, 0, position.line, position.character));
        if (prompt) {
            const newCompletions = await this.getCompletion(prompt);
            let completionItems: InlineCompletionItem[] = [];
            for await (const part of newCompletions) {
                completionItems.push(
                    new InlineCompletionItem(
                        part.choices?.[0]?.text || '',
                        new Range(position.line, 0, position.line, position.character)
                    )
                );
            }
            return new InlineCompletionList(completionItems);
        }
    }
}
}