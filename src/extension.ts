import * as vscode from 'vscode';
import { LLMCompletionProvider } from './completion_provider';
import { commands } from './commands';
import { ContextSelectionView } from './ui/context_view';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('multicompletion is now active!');
  console.log('Version: ', context.extension.packageJSON['version']);
  console.log('Activating multicompletion settings...'); // Added log statement
  LLMCompletionProvider.build();

  vscode.commands.executeCommand(
    'setContext',
    'multicompletion:useContextGitignore',
    vscode.workspace
      .getConfiguration('multicompletion')
      .get<boolean>('context_gitignore', true)
  );

  context.subscriptions.push(
    ContextSelectionView.build(context),
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      LLMCompletionProvider.instance()
    ),
    ...commands
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
