// Utility functions for applying Markdown formatting to Monaco Editor selections
// src/utils/markdownFormatUtil.ts
export function applyMarkdownFormat(editor: any, formatType: string) {
  if (!editor) return;

  const selection = editor.getSelection();
  const model = editor.getModel();

  if (!selection || !model) return;

  const selectedText = model.getValueInRange(selection);
  let newText = "";
  let cursorOffset = 0; // offset to position cursor after insertion
  let toggled = false; // whether we removed an existing wrapper

  // compute start offset of selection so we can restore selection after edits
  let startOffset: number | null = null;
  try {
    startOffset = model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn,
    });
  } catch (err) {
    startOffset = null;
  }

  switch (formatType) {
    case "bold":
      if (
        selectedText &&
        selectedText.startsWith("**") &&
        selectedText.endsWith("**")
      ) {
        newText = selectedText.slice(2, -2);
        toggled = true;
      } else {
        newText = `**${selectedText || "bold text"}**`;
      }
      cursorOffset = selectedText ? 2 : -2;
      break;

    case "italic":
      if (
        selectedText &&
        selectedText.startsWith("*") &&
        selectedText.endsWith("*")
      ) {
        newText = selectedText.slice(1, -1);
        toggled = true;
      } else {
        newText = `*${selectedText || "italic text"}*`;
      }
      cursorOffset = selectedText ? 1 : -1;
      break;

    case "code":
      if (
        selectedText &&
        selectedText.startsWith("`") &&
        selectedText.endsWith("`") &&
        !selectedText.startsWith("```") &&
        !selectedText.endsWith("```")
      ) {
        newText = selectedText.slice(1, -1);
        toggled = true;
      } else {
        newText = `\`${selectedText || "code"}\``;
      }
      cursorOffset = selectedText ? 1 : -1;
      break;

    case "underline":
      // Use HTML <u> tag since Markdown has no standard underline syntax
      if (
        selectedText &&
        selectedText.startsWith("<u>") &&
        selectedText.endsWith("</u>")
      ) {
        newText = selectedText.slice(3, -4);
        toggled = true;
      } else {
        newText = `<u>${selectedText || "underlined text"}</u>`;
      }
      cursorOffset = selectedText ? 0 : -4;
      break;

    case "strikethrough":
      if (
        selectedText &&
        selectedText.startsWith("~~") &&
        selectedText.endsWith("~~")
      ) {
        newText = selectedText.slice(2, -2);
        toggled = true;
      } else {
        newText = `~~${selectedText || "strikethrough"}~~`;
      }
      cursorOffset = selectedText ? 2 : -2;
      break;

    case "link":
      if (selectedText) {
        // If selection already looks like [text](url), unwrap to just the text
        const m = selectedText.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m) {
          newText = m[1];
          toggled = true;
          cursorOffset = 0;
        } else {
          newText = `[${selectedText}](url)`;
          cursorOffset = -4; // moves cursor before closing )
        }
      } else {
        newText = `[link text](url)`;
        cursorOffset = -11; // moves cursor to "link text"
      }
      break;

    case "unorderedList":
      return applyListFormatting(editor, model, selection);

    default:
      return;
  }

  editor.executeEdits("toolbar-format", [
    {
      range: selection,
      text: newText,
      forceMoveMarkers: true,
    },
  ]);

  // If there was a selection, restore the selection to cover the replaced text
  if (selectedText && startOffset !== null) {
    try {
      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(startOffset + newText.length);
      editor.setSelection({
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
      });
    } catch (err) {
      // ignore restore errors
    }
  } else if (cursorOffset !== 0) {
    // Position cursor (for no-selection insertions)
    const position = editor.getPosition();
    if (cursorOffset < 0) {
      const newColumn = position.column + cursorOffset;
      editor.setPosition({
        lineNumber: position.lineNumber,
        column: newColumn,
      });
    }
  }

  editor.focus();
}

// Apply unordered list formatting to selected lines
function applyListFormatting(editor: any, model: any, selection: any) {
  const startLine = selection.startLineNumber;
  const endLine = selection.endLineNumber;

  const edits = [];
  let allLinesHaveBullet = true;

  // Check if all selected lines already have bullets
  for (let line = startLine; line <= endLine; line++) {
    const lineContent = model.getLineContent(line);
    if (!lineContent.trim().startsWith("- ") && lineContent.trim() !== "") {
      allLinesHaveBullet = false;
      break;
    }
  }

  // Either add or remove bullets from all lines
  for (let line = startLine; line <= endLine; line++) {
    const lineContent = model.getLineContent(line);
    const trimmedLine = lineContent.trim();

    if (trimmedLine === "") continue;

    if (allLinesHaveBullet) {
      // Remove bullet
      if (trimmedLine.startsWith("- ")) {
        const newText = trimmedLine.substring(2);
        edits.push({
          range: {
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: lineContent.length + 1,
          },
          text: newText,
        });
      }
    } else {
      // Add bullet
      if (!trimmedLine.startsWith("- ")) {
        edits.push({
          range: {
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1,
          },
          text: "- ",
        });
      }
    }
  }

  if (edits.length > 0) {
    editor.executeEdits("toolbar-list", edits);
  }

  editor.focus();
}

export function getEditorInstance(editorRef: any): any {
  return editorRef.current;
}
