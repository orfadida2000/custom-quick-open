const vscode = require("vscode");

const COMMAND_ID = "customQuickOpen.open";

const POSIX_REMOTE_NAMES = new Set([
  "wsl",
  "dev-container",
  "attached-container",
  "codespaces"
]);

function activate(context) {
  const disposable = vscode.commands.registerCommand(COMMAND_ID, openCustomQuickOpen);
  context.subscriptions.push(disposable);
}

function deactivate() {}

async function openCustomQuickOpen() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    await openQuickOpen();
    return;
  }

  const selectionText = getUsableSelectionText(editor);
  if (selectionText) {
    await openQuickOpen(selectionText);
    return;
  }

  const mode = getPathMode();

  let prefix = "";

  if (mode === "windows" || mode === "posix") {
    prefix = extractPathTokenUnderCursor(editor, mode).trim();
  }

  if (!prefix) {
    prefix = getWordUnderCursor(editor).trim();
  }

  if (prefix) {
    await openQuickOpen(prefix);
  } else {
    await openQuickOpen();
  }
}

function getUsableSelectionText(editor) {
  const selection = editor.selection;

  if (selection.isEmpty) {
    return "";
  }

  const text = editor.document.getText(selection).trim();

  if (!text) {
    return "";
  }

  if (containsNewline(text)) {
    return "";
  }

  return text;
}

function getPathMode() {
  const remoteName = vscode.env.remoteName;

  if (POSIX_REMOTE_NAMES.has(remoteName)) {
    return "posix";
  }

  if (remoteName === undefined && process.platform === "win32") {
    return "windows";
  }

  if (remoteName === undefined && process.platform !== "win32") {
    return "posix";
  }

  return "word-only";
}

function extractPathTokenUnderCursor(editor, mode) {
  const document = editor.document;
  const position = editor.selection.active;
  const line = document.lineAt(position.line).text;
  const column = clamp(position.character, 0, line.length);

  const quoted = extractQuotedTokenUnderCursor(line, column, mode);
  if (quoted) {
    return quoted;
  }

  const separators = mode === "windows" ? ["\\", "/"] : ["/"];

  const candidates = [];

  for (const separator of separators) {
    const span = extractBroadPathSpan(line, column, mode, separator);

    if (!span) {
      continue;
    }

    const localCursor = column - span.start;
    const spans = splitSpanIntoSpaceBoundedCandidates(span.text, localCursor);

    for (const candidate of spans) {
      const token = candidate.trim();

      if (!token) {
        continue;
      }

      if (isValidPathToken(token, mode, separator, false)) {
        candidates.push({
          token,
          score: scoreToken(token, mode, separator)
        });
      }
    }
  }

  if (candidates.length === 0) {
    return "";
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.token.length - a.token.length;
  });

  return candidates[0].token;
}

function extractQuotedTokenUnderCursor(line, column, mode) {
  const quoteChars = [`"`, `'`, "`"];
  const separators = mode === "windows" ? ["\\", "/"] : ["/"];

  for (const quote of quoteChars) {
    const left = line.lastIndexOf(quote, Math.max(0, column - 1));

    if (left === -1) {
      continue;
    }

    const right = line.indexOf(quote, column);

    if (right === -1 || right <= left) {
      continue;
    }

    const token = line.slice(left + 1, right).trim();

    if (!token || containsNewline(token)) {
      continue;
    }

    for (const separator of separators) {
      if (isValidPathToken(token, mode, separator, true)) {
        return token;
      }
    }
  }

  return "";
}

function extractBroadPathSpan(line, column, mode, separator) {
  if (line.length === 0) {
    return null;
  }

  let anchor = -1;

  if (column < line.length && isAllowedPathChar(line[column], mode, separator)) {
    anchor = column;
  } else if (column > 0 && isAllowedPathChar(line[column - 1], mode, separator)) {
    anchor = column - 1;
  }

  if (anchor === -1) {
    return null;
  }

  let start = anchor;
  while (start > 0 && isAllowedPathChar(line[start - 1], mode, separator)) {
    start--;
  }

  let end = anchor + 1;
  while (end < line.length && isAllowedPathChar(line[end], mode, separator)) {
    end++;
  }

  return {
    text: line.slice(start, end),
    start,
    end
  };
}

function splitSpanIntoSpaceBoundedCandidates(text, cursorIndex) {
  const starts = [0];
  const ends = [text.length];

  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      starts.push(i + 1);
      ends.push(i);
    }
  }

  const candidates = [];

  for (const start of starts) {
    for (const end of ends) {
      if (start >= end) {
        continue;
      }

      if (!rangeTouchesCursor(start, end, cursorIndex)) {
        continue;
      }

      candidates.push(text.slice(start, end));
    }
  }

  return candidates;
}

function isValidPathToken(token, mode, separator, allowAmbiguousSingleComponent) {
  if (!token || containsNewline(token)) {
    return false;
  }

  if (!usesOnlyThisSeparator(token, separator)) {
    return false;
  }

  if (mode === "windows" && isWindowsAbsolutePath(token, separator)) {
    const rest = token.slice(3);
    return areValidComponents(rest.split(separator));
  }

  if (mode === "posix" && separator === "/" && token.startsWith("/")) {
    const rest = token.slice(1);
    return areValidComponents(rest.split(separator));
  }

  if (token.includes(separator)) {
    return areValidComponents(token.split(separator));
  }

  return isValidSingleComponent(token, allowAmbiguousSingleComponent);
}

function areValidComponents(components) {
  if (components.length === 0) {
    return false;
  }

  for (const component of components) {
    if (!isValidComponent(component)) {
      return false;
    }
  }

  return true;
}

function isValidComponent(component) {
  if (!component) {
    return false;
  }

  if (component !== component.trim()) {
    return false;
  }

  if (component === "." || component === "..") {
    return false;
  }

  return /^[A-Za-z0-9._ -]+$/.test(component);
}

function isValidSingleComponent(component, allowAmbiguousSingleComponent) {
  if (!isValidComponent(component)) {
    return false;
  }

  if (allowAmbiguousSingleComponent) {
    return true;
  }

  if (component.includes(" ")) {
    return false;
  }

  return /[._-]/.test(component);
}

function isAllowedPathChar(char, mode, separator) {
  if (/^[A-Za-z0-9._ -]$/.test(char)) {
    return true;
  }

  if (char === separator) {
    return true;
  }

  if (mode === "windows" && char === ":") {
    return true;
  }

  return false;
}

function usesOnlyThisSeparator(token, separator) {
  if (separator === "/") {
    return !token.includes("\\");
  }

  return !token.includes("/");
}

function isWindowsAbsolutePath(token, separator) {
  if (separator === "\\") {
    return /^[A-Za-z]:\\/.test(token);
  }

  return /^[A-Za-z]:\//.test(token);
}

function scoreToken(token, mode, separator) {
  let score = 0;

  if (mode === "windows" && isWindowsAbsolutePath(token, separator)) {
    score += 1000;
  }

  if (mode === "posix" && token.startsWith("/")) {
    score += 1000;
  }

  if (token.includes(separator)) {
    score += 500;
  }

  const components = token.split(separator).filter(Boolean);
  const first = components[0] || "";
  const last = components[components.length - 1] || "";

  if (first && !first.includes(" ")) {
    score += 100;
  }

  if (last && !last.includes(" ")) {
    score += 100;
  }

  if (/[._-]/.test(last)) {
    score += 50;
  }

  return score;
}

function getWordUnderCursor(editor) {
  const document = editor.document;
  const position = editor.selection.active;
  const range = document.getWordRangeAtPosition(position);

  if (!range) {
    return "";
  }

  const text = document.getText(range).trim();

  if (!text || containsNewline(text)) {
    return "";
  }

  return text;
}

function openQuickOpen(prefix) {
  if (prefix) {
    return vscode.commands.executeCommand("workbench.action.quickOpen", prefix);
  }

  return vscode.commands.executeCommand("workbench.action.quickOpen");
}

function containsNewline(text) {
  return /\r|\n/.test(text);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rangeTouchesCursor(start, end, cursorIndex) {
  return cursorIndex >= start && cursorIndex <= end;
}

module.exports = {
  activate,
  deactivate
};
