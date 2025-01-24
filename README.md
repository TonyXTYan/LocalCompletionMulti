# multicompletion

Local LLM based code completion like Copilot.

> This extension does not come with a built in backend for running LLMs. Instead you are able to use any existing tool that supports the OpenAI API format. Like the [Oobabooga WebUI](https://github.com/oobabooga/text-generation-webui) and many other

> NOTE: I stopped using Visual Studio Code and therefore also won't continue developing this extension. I will merge pull requests if needed and even fix smaller issues if necessary but there will be no new features added.
> If you're searching for an alternative I suggest the great [continuer.dev](https://github.com/continuedev/continue) extension.

## Features

- Inline (multi line) code completion
- Works with any OpenAI compatible API
- Save multiple API Endpoints and switch easily between them
- Reducing requests to LLMs by
  - saving previous responses
  - skipping completion depending on the last symbol
  - only posting request if no input was given for some time (can be specified in the settings)
- Dynamically detect multi line or single line completion
- Add other files to the completion context to improve the output

## Extension Settings

- `multicompletion.active_endpoint`: The URL of the API which is used for generating the code completion
- `multicompletion.endpoints`: List of URL endpoints
- `multicompletion.temperature`: Temperature of the LLM
- `multicompletion.max_tokens`: Maximum number of tokens in the response
- `multicompletion.stop_sequences`: Additional stop sequences (max. 2)
- `multicompletion.reduce_calls`: Reduce API calls with various strategies (e.g. skip completion if last symbol was a letter)
- `multicompletion.skip_autocomplete_widget`: Skip completion if autocomplete widget is active
- `multicompletion.completion_timeout`: Minimum time between keystrokes (in ms) before sending a completion request (Reduces API calls, which are closed immediately after)
- `multicompletion.max_lines`: Maximum number of lines in the response (empty lines are ignored)
- `multicompletion.add_visible_files`: Add all visible files to completion context
- `multicompletion.context_files`: List of files to add to completion context (should usually not be edited manually)
- `multicompletion.context_gitignore`: Whether to ignore files in the `.gitignore` in the context selection view

## Known Issues

### OpenAPI keys

The extension does not yet support a custom API key. This means it only works for APIs which do not need a key.

### Model switching

Model switching is not supported at the moment as most local tools don't support that property either.

### Context selection

Symlinks can cause problems with additional context selection. They are not handled properly at the moment.

Selected files in the `.gitignore` are not automatically removed from the additional when "Apply .gitignore to context" is checked

### No `git` installed

In order to automatically ignore files in the `.gitignore` for the context I use a package which interacts with git. At the moment, I was not able to test the extension without `git` installed. If you encounter any issues please let me know.
