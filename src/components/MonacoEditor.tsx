"use client";

import { useEffect, useRef, useState } from 'react';
import { Editor, type OnMount, type OnChange } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import type * as Monaco from 'monaco-editor';
import type * as Y from 'yjs';

interface MonacoEditorProps {
  // Yjs integration
  yjsDoc?: Y.Doc | null;
  sharedText?: Y.Text | null;
  
  // Editor configuration
  language?: string;
  theme?: string;
  height?: string | number;
  width?: string | number;
  
  // Event handlers
  onCursorPositionChange?: (position: { lineNumber: number; column: number }) => void;
  onSelectionChange?: (selection: { 
    startLineNumber: number; 
    startColumn: number; 
    endLineNumber: number; 
    endColumn: number; 
  }) => void;
  
  // User awareness data for displaying remote cursors
  remoteUsers?: Array<{
    user: { name: string; color: string; id: string };
    cursor?: { line: number; column: number };
    selection?: { 
      start: { line: number; column: number }; 
      end: { line: number; column: number } 
    };
  }>;
  
  // Initial content (used only when not using Yjs)
  initialValue?: string;
  
  // Standard Monaco props
  options?: Monaco.editor.IStandaloneEditorConstructionOptions;
  
  // Callbacks
  onChange?: OnChange;
  onMount?: OnMount;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  yjsDoc,
  sharedText,
  language = 'typescript',
  theme = 'vs-dark',
  height = '400px',
  width = '100%',
  onCursorPositionChange,
  onSelectionChange,
  remoteUsers = [],
  initialValue = '',
  options = {},
  onChange,
  onMount,
}) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isReady, setIsReady] = useState(false);
  const decorationsRef = useRef<string[]>([]);

  // Default editor options
  const defaultOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastColumn: 5,
    automaticLayout: true,
    wordWrap: 'on',
    wrappingStrategy: 'advanced',
    ...options,
  };

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);

    // Set up Yjs binding if available
    if (yjsDoc && sharedText) {
      bindingRef.current = new MonacoBinding(
        sharedText,
        editor.getModel()!,
        new Set([editor]),
        // Awareness provider - we'll handle this through our SSE system
        null
      );
      
      console.log('Monaco Editor connected to Yjs document');
    }

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorPositionChange) {
        onCursorPositionChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Set up selection tracking
    editor.onDidChangeCursorSelection((e) => {
      if (onSelectionChange) {
        onSelectionChange({
          startLineNumber: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLineNumber: e.selection.endLineNumber,
          endColumn: e.selection.endColumn,
        });
      }
    });

    // Call custom onMount handler
    if (onMount) {
      onMount(editor, monaco);
    }
  };

  // Handle editor content change (for non-Yjs mode)
  const handleEditorChange: OnChange = (value, event) => {
    if (onChange && !bindingRef.current) {
      // Only call onChange if not using Yjs (to avoid conflicts)
      onChange(value, event);
    }
  };

  // Update remote cursors and selections
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !isReady) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Clear existing decorations
    editor.deltaDecorations(decorationsRef.current, []);
    decorationsRef.current = [];

    // Create decorations for remote users
    const newDecorations: Monaco.editor.IModelDeltaDecoration[] = [];

    remoteUsers.forEach((user) => {
      if (user.cursor) {
        // Convert 0-based line/column to 1-based (Monaco uses 1-based)
        const lineNumber = user.cursor.line + 1;
        const column = user.cursor.column + 1;

        // Cursor decoration
        newDecorations.push({
          range: new monaco.Range(lineNumber, column, lineNumber, column),
          options: {
            className: 'remote-cursor',
            afterContentClassName: 'remote-cursor-line',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            after: {
              content: ` ${user.user.name}`,
              inlineClassName: 'remote-cursor-label',
              inlineClassNameAffectsLetterSpacing: true,
            },
          },
        });
      }
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (user.selection && user.selection.start && user.selection.end) {
        // Convert 0-based to 1-based coordinates
        const startLine = user.selection.start.line + 1;
        const startCol = user.selection.start.column + 1;
        const endLine = user.selection.end.line + 1;
        const endCol = user.selection.end.column + 1;

        // Selection decoration
        newDecorations.push({
          range: new monaco.Range(startLine, startCol, endLine, endCol),
          options: {
            className: 'remote-selection',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }
    });

    // Apply new decorations
    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  }, [remoteUsers, isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="monaco-editor-container relative">
      {/* Custom CSS for remote cursors */}
      <style jsx global>{`
        .remote-cursor {
          background-color: transparent !important;
          border-left: 2px solid var(--cursor-color, #ff6b6b) !important;
          border-right: none !important;
          position: relative;
        }
        
        .remote-cursor-line::after {
          content: '';
          position: absolute;
          top: 0;
          left: -1px;
          width: 2px;
          height: 100%;
          background-color: var(--cursor-color, #ff6b6b);
          pointer-events: none;
        }
        
        .remote-cursor-label {
          background-color: var(--cursor-color, #ff6b6b) !important;
          color: white !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          white-space: nowrap !important;
          position: relative !important;
          top: -18px !important;
          left: -2px !important;
          z-index: 1000 !important;
        }
        
        .remote-selection {
          background-color: var(--selection-color, rgba(255, 107, 107, 0.2)) !important;
          border-radius: 2px !important;
        }
      `}</style>

      <Editor
        height={height}
        width={width}
        language={language}
        theme={theme}
        value={bindingRef.current ? undefined : initialValue}
        options={defaultOptions}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
      />
      
      {/* User indicators */}
      {remoteUsers.length > 0 && (
        <div className="absolute top-2 right-2 flex gap-2">
          {remoteUsers.map((user, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-xs text-white"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: user.user.color }}
              />
              <span>{user.user.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};