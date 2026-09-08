# Custom Quick Open

Custom Quick Open opens VS Code Quick Open with a useful token extraction modes that the default Quick Open doesn't support.

It provides a behavior similar to find-in-files by extracting a token either from the current selection or from the token under the cursor and prefilling Quick Open with it.
The extension exposes a command for each extraction mode, so different commands can be used in different contexts, depending on the user's needs and/or the editor's state.

## Path-like token extraction

### Environment detection

The extension detects the environment in which VS Code is running to determine the appropriate path separator rules.
It uses different path separator rules depending on the environment. The following table summarizes the path separator rules:

| Condition                                        | Mode        | Accepted path separators |
| ------------------------------------------------ | ----------- | ------------------------ |
| `vscode.env.remoteName === "wsl"`                | POSIX       | `/`                      |
| `vscode.env.remoteName === "dev-container"`      | POSIX       | `/`                      |
| `vscode.env.remoteName === "attached-container"` | POSIX       | `/`                      |
| `vscode.env.remoteName === "codespaces"`         | POSIX       | `/`                      |
| local Windows                                    | Windows     | `/` or `\`               |
| local non-Windows                                | POSIX       | `/`                      |
| other remote environments                        | Unsupported |                          |

A valid path-like token must not contain mixed path separators. For example, `src/components\Button.tsx` is rejected as a path-like token because it mixes POSIX and Windows separators.
Unsupported remote environments, such as SSH remotes or tunnels, intentionally fall back to VS Code's normal word-under-cursor behavior because their filesystem path style is not guaranteed.

#### POSIX path tokens

POSIX mode uses `/` as the path separator.

Examples:

```text
src/components/Button.tsx
src/My Component/Button.tsx
/home/or/project/src/file.ts
```

#### Windows path tokens

Windows mode supports either `/` or `\`, but rejects tokens that mix both separators.

Examples accepted:

```text
src\components\Button.tsx
src/components/Button.tsx
C:\Users\Or\project\file.ts
C:/Users/Or/project/file.ts
```

Examples rejected as path tokens:

```text
src/components\Button.tsx
C:\Users/Or/project/file.ts
```

### Path component rules

Path components may contain:

```text
letters, digits, spaces, dots, underscores, hyphens
```

The components `.` and `..` are rejected.

The extension intentionally does not use `./` or `../` prefixes because VS Code Quick Open usually matches workspace-relative paths, file names, or absolute path strings. In practice, prefixes such as `./` often make Quick Open matching worse.

### Single-component tokens

Single-component unquoted tokens are handled conservatively because spaces make them ambiguous.

Accepted as path-like tokens:

```text
Button.tsx
my-file
my_file
```

Rejected as path-like tokens:

```text
My Component
some normal text
```

Quoted or backticked single-component tokens with spaces are accepted:

```text
"My Component"
'My Component'
`My Component`
```

If no path-like token is found, the extension falls back to VS Code's normal word-under-cursor behavior.

## Commands

### Open from Selection or Token

#### Command ID

```text
customQuickOpen.open
```

#### Description

This command opens Quick Open with a token extracted from the current selection or from the token under the cursor, while simultaneously validating the path token does not contain mixed path separators.

#### Behavior

When the command runs, it tries the following sources in order:

1. The current selected text.
2. A path-like token under the cursor.
3. VS Code's normal word under the cursor.

If none of the above sources yield a usable token, the command falls back to opening Quick Open with no arguments, which is equivalent to the default Quick Open behavior.

#### Selection handling

If text is selected:

1. The selected text is trimmed.
2. If the trimmed text contains a newline, it is ignored.
3. If the trimmed text is non-empty and single-line, it is used as the Quick Open query.

Examples accepted:

```text
src/components/Button.tsx
Button.tsx
My Component
```

Examples ignored:

```text
src/components/Button.tsx
src/components/Input.tsx
```

Multi-line selections are ignored because Quick Open expects a single query string.

#### Token extraction

If no usable selection exists, the extension tries to extract a path-like token from the current line.

The token is always extracted from the same line as the cursor. It never crosses line boundaries.

#### Default shortcut

Windows/Linux:

```text
Ctrl+K Ctrl+P
```

macOS:

```text
Cmd+K Cmd+P
```

This is a key chord. Because it starts with `Ctrl+K` / `Cmd+K`, it may interfere with normal copy behavior. You can rebind the command from VS Code's Keyboard Shortcuts UI.

### Open Python Module from Selection or Token

#### Command ID

```text
customQuickOpen.openPythonModule
```

#### Description

This command extracts a python module name from the current selection or from the word under the cursor (with custom regex rules), normalizes it to a path, and opens Quick Open prefilled with the normalized path.

#### Behavior

When the command runs, it tries the following sources in order:

1. The current selected text (post trimming).
2. A token under the cursor using the regex `/[A-Za-z0-9_.]+/`.

If none of the above sources yield a usable token, the command falls back to opening Quick Open with no arguments, which is equivalent to the default Quick Open behavior.

#### Selection handling

If text is selected:

1. The selected text is trimmed.
2. The trimmed text undergoes token validation and extraction (see below).
3. If the validated token is non-empty it is used, otherwise it falls back to trying the token under the cursor source.

Examples accepted:

```text
src.foo.bar
.xyz
```

Examples rejected:

```text
src/foo/bar
src .foo.bar
```

#### Token extraction

A token is validated to match the regex `/^\.*((?:[A-Za-z_][A-Za-z_0-9]*)(?:\.[A-Za-z_][A-Za-z_0-9]*)*)\.*$/`.
The regex allows for leading and trailing dots because of a common Python convention of using leading dots for relative imports and trailing dots for cases like comments or docstrings which can have trailing dots for punctuation.
If the token is valid, it is normalized to a path by replacing all dots with slashes and appending `.py` to the end.

#### Default shortcut

Windows/Linux:

```text
Ctrl+K Ctrl+alt+P
```

macOS:

```text
Cmd+K Cmd+alt+P
```

This is a key chord. Because it starts with `Ctrl+K` / `Cmd+K`, it may interfere with normal copy behavior. You can rebind the command from VS Code's Keyboard Shortcuts UI.

## Installation

To install the extension, you can either:

- Install it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=orfadida.custom-quick-open).
- Install it using VS Code's command line interface using the command `code --install-extension orfadida.custom-quick-open`.

## Requirements

- VS Code `1.74.0` or newer.
- Node.js `20.0.0` or newer for local packaging/development.

## Repository

[GitHub repository](https://github.com/orfadida2000/custom-quick-open)

## License

MIT.<br>
See **[LICENSE](LICENSE)** for details.

## Author

- **Name:** Or Fadida
- **Email:** [or@fadida.net](mailto:or@fadida.net)
- **GitHub:** [orfadida2000](https://github.com/orfadida2000)
