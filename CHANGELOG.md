# Changelog

## [1.0.0] - 2026-06-10

### Added

- Initial release.
- Added the `customQuickOpen.open` command.
- Added default keybinding:
  - Windows/Linux: `Ctrl+C Ctrl+P`
  - macOS: `Cmd+C Cmd+P`
- Added Quick Open prefixing from selected text.
- Added trimming for selected text before use.
- Added rejection of selected text that still contains a newline after trimming.
- Added same-line path-like token extraction from the cursor position.
- Added POSIX path-token extraction for:
  - WSL
  - Dev Containers
  - Attached Containers
  - Codespaces
  - local non-Windows environments
- Added Windows path-token extraction for local Windows environments.
- Added support for Windows paths using either `/` or `\`, while rejecting mixed separators in the same token.
- Added rejection of `.` and `..` path components.
- Added conservative handling for ambiguous single-component tokens.
- Added fallback to VS Code's normal word-under-cursor behavior.
- Added fallback to normal Quick Open when no prefix is found.
