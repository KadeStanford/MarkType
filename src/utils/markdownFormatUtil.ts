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

  switch (formatType) {
    case "bold":
      newText = `**${selectedText || "bold text"}**`;
      cursorOffset = selectedText ? 2 : -2; // if no selection, cursor goes inside
      break;

    case "italic":
      newText = `*${selectedText || "italic text"}*`;
      cursorOffset = selectedText ? 1 : -1;
      break;

    case "code":
      newText = `\`${selectedText || "code"}\``;
      cursorOffset = selectedText ? 1 : -1;
      break;

    case "link":
      if (selectedText) {
        // If text is selected, wrap it as link text
        newText = `[${selectedText}](url)`;
        // Position cursor at "url" to replace it
        cursorOffset = -4; // moves cursor before closing )
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

  // Position cursor
  if (cursorOffset !== 0) {
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