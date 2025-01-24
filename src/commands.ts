import {
  window,
  workspace,
  commands as vscommands,
  ConfigurationTarget,
} from 'vscode';
import { LLMCompletionProvider } from './completion_provider';
import { EndpointPicker } from './ui/quick_actions';
import { ContextSelectionView } from './ui/context_view';

function setEndpoint() {
  const endpointPicker = new EndpointPicker();
  endpointPicker.show();
}

function toggle() {
  const enabled = workspace
    .getConfiguration('editor')
    .get('inlineSuggest.enabled', true);

  workspace
    .getConfiguration('editor')
    .update('inlineSuggest.enabled', !enabled, ConfigurationTarget.Global);

  LLMCompletionProvider.instance().updateSettings();

  if (!enabled) {
    LLMCompletionProvider.instance().statusBarItem.setInactive();
  } else {
    LLMCompletionProvider.instance().statusBarItem.setOff();
  }

  window.showInformationMessage(
    `multicompletion ${!enabled ? 'enabled' : 'disabled'}!`
  );
  console.debug("Toggled 'inlineSuggest.enabled'");
}

function regenerate() {
  vscommands.executeCommand('editor.action.inlineSuggest.trigger');
}

function refreshContextView() {
  ContextSelectionView.instance().refresh();
}

function applyContextGitignore() {
  workspace
    .getConfiguration('multicompletion')
    .update('context_gitignore', true, ConfigurationTarget.Global)
    .then(() =>
      vscommands.executeCommand('multicompletion.refresh_context_view')
    );
  vscommands.executeCommand(
    'setContext',
    'multicompletion:useContextGitignore',
    true
  );
}

function disableContextGitignore() {
  workspace
    .getConfiguration('multicompletion')
    .update('context_gitignore', false, ConfigurationTarget.Global)
    .then(() =>
      vscommands.executeCommand('multicompletion.refresh_context_view')
    );
  vscommands.executeCommand(
    'setContext',
    'multicompletion:useContextGitignore',
    false
  );
}

export const commands = [
  vscommands.registerCommand('multicompletion.select_endpoint', setEndpoint),
  vscommands.registerCommand('multicompletion.toggle', toggle),
  vscommands.registerCommand('multicompletion.regenerate', regenerate),
  vscommands.registerCommand(
    'multicompletion.refresh_context_view',
    refreshContextView
  ),
  vscommands.registerCommand(
    'multicompletion.apply_context_gitignore',
    applyContextGitignore
  ),
  vscommands.registerCommand(
    'multicompletion.disable_context_gitignore',
    disableContextGitignore
  ),
];
