# Custom Quick Open

Custom Quick Open opens VS Code Quick Open with a useful prefilled query based on the current editor context.

It is intended as a smarter alternative to the regular `Ctrl+P` flow when the text you want to search for is already selected, under the cursor, or appears as a path-like token on the current line.

## Behavior

When the command runs, it tries the following sources in order:

1. The current selected text.
2. A path-like token under the cursor.
3. VS Code's normal word under the cursor.
4. Normal Quick Open with no prefix.

## Selection handling

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

## Path-token extraction

If no usable selection exists, the extension tries to extract a path-like token from the current line.

The token is always extracted from the same line as the cursor. It never crosses line boundaries.

### Environment detection

The extension always runs as a UI extension.

Path extraction mode is chosen using this logic:

| Condition | Mode |
|---|---|
| `vscode.env.remoteName === "wsl"` | POSIX |
| `vscode.env.remoteName === "dev-container"` | POSIX |
| `vscode.env.remoteName === "attached-container"` | POSIX |
| `vscode.env.remoteName === "codespaces"` | POSIX |
| local Windows | Windows |
| local non-Windows | POSIX |
| other remote environments | fallback to word under cursor |

Unknown remote environments, such as SSH remotes or tunnels, intentionally fall back to VS Code's normal word-under-cursor behavior because their filesystem path style is not guaranteed.

## POSIX path tokens

POSIX mode uses `/` as the path separator.

Examples:

```text
src/components/Button.tsx
src/My Component/Button.tsx
/home/or/project/src/file.ts
```

## Windows path tokens

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

## Component rules

Path components may contain:

```text
letters, digits, spaces, dots, underscores, hyphens
```

The components `.` and `..` are rejected.

The extension intentionally does not use `./` or `../` prefixes because VS Code Quick Open usually matches workspace-relative paths, file names, or absolute path strings. In practice, prefixes such as `./` often make Quick Open matching worse.

## Single-component tokens

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

## Default shortcut

Windows/Linux:

```text
Ctrl+C Ctrl+P
```

macOS:

```text
Cmd+C Cmd+P
```

This is a key chord. Because it starts with `Ctrl+C` / `Cmd+C`, it may interfere with normal copy behavior. You can rebind the command from VS Code's Keyboard Shortcuts UI.

## Command

```text
customQuickOpen.open
```

Command title:

```text
Custom Quick Open: Open from Selection or Token
```

## Packaging

Install dependencies:

```bash
npm install
```

Package the extension:

```bash
npm run package
```

Install the generated VSIX:

```bash
code --install-extension custom-quick-open-1.0.0.vsix
```

## Requirements

- VS Code `1.74.0` or newer.
- Node.js `20.0.0` or newer for local packaging/development.
