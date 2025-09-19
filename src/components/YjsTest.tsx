"use client";

import { useState, useEffect } from 'react';
import { useCollaborativeDocument } from '../hooks/useCollaborativeDocument';

export const YjsTest = () => {
  const { 
    isConnected, 
    error, 
    userId,
    sharedText,
    joinDocument, 
    leaveDocument, 
    updateCursor,
    remoteUsers,
    currentDocumentId
  } = useCollaborativeDocument();
  
  const [documentId, setDocumentId] = useState('test-yjs-doc-123');
  const [textContent, setTextContent] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 });

  // Listen to Yjs text changes
  useEffect(() => {
    if (!sharedText) return;

    const observer = () => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
      setTextContent(sharedText.toString());
    };

    // Set initial content
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    setTextContent(sharedText.toString());
    
    // Listen for changes
    sharedText.observe(observer);

    return () => {
      sharedText.unobserve(observer);
    };
  }, [sharedText]);

  const handleJoinDocument = () => {
    joinDocument(documentId, 'Welcome to collaborative editing!\n\nType here and see your changes sync in real-time across multiple browser tabs.');
  };

  const handleLeaveDocument = () => {
    leaveDocument();
  };

  const handleTextChange = (newText: string) => {
    if (!sharedText) return;

    // Calculate the difference and apply it to Yjs
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const currentText = sharedText.toString();
    
    // Simple diff implementation for demo
    if (newText.length > currentText.length) {
      // Text was inserted
      const insertPos = findInsertPosition(currentText, newText);
      const insertedText = newText.slice(insertPos, insertPos + (newText.length - currentText.length));
      sharedText.insert(insertPos, insertedText);
    } else if (newText.length < currentText.length) {
      // Text was deleted
      const deletePos = findDeletePosition(currentText, newText);
      const deleteCount = currentText.length - newText.length;
      sharedText.delete(deletePos, deleteCount);
    } else if (newText !== currentText) {
      // Text was replaced
      sharedText.delete(0, currentText.length);
      sharedText.insert(0, newText);
    }
  };

  const handleCursorMove = (line: number, column: number) => {
    setCursorPosition({ line, column });
    updateCursor({ line, column });
  };

  // Simple helper functions for text diffing
  const findInsertPosition = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i;
      }
    }
    return oldText.length;
  };

  const findDeletePosition = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i;
      }
    }
    return newText.length;
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white/10 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Yjs Document Synchronization Test</h2>
      
      {/* Connection Status */}
      <div className="mb-4 flex items-center gap-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <span className="text-sm text-gray-300">User ID: {userId}</span>
        {currentDocumentId && (
          <span className="text-sm text-gray-300">Document: {currentDocumentId}</span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {/* Document Controls */}
      <div className="space-y-3 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Document ID:</label>
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-black"
            placeholder="Enter document ID"
            disabled={currentDocumentId !== null}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleJoinDocument}
            disabled={currentDocumentId !== null}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Document
          </button>
          <button
            onClick={handleLeaveDocument}
            disabled={!currentDocumentId}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Leave Document
          </button>
        </div>
      </div>

      {/* Collaborative Text Editor */}
      {currentDocumentId && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Collaborative Text:</label>
            <textarea
              value={textContent}
              onChange={(e) => handleTextChange(e.target.value)}
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const text = target.value;
                const position = target.selectionStart;
                
                // Calculate line and column from position
                const lines = text.substring(0, position).split('\n');
                const line = lines.length - 1;
                const column = lines[lines.length - 1]?.length || 0;
                
                handleCursorMove(line, column);
              }}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded text-black font-mono text-sm"
              placeholder="Start typing to see real-time collaboration..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Cursor: Line {cursorPosition.line + 1}, Column {cursorPosition.column + 1}
            </p>
          </div>

          {/* Remote Users Display */}
          {remoteUsers.length > 0 && (
            <div className="bg-black/20 rounded p-4">
              <h3 className="font-medium mb-2">Other Users:</h3>
              <div className="space-y-2">
                {remoteUsers.map((user, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: user.user.color }}
                    ></div>
                    <span>{user.user.name}</span>
                    {user.cursor && (
                      <span className="text-gray-400">
                        @ Line {user.cursor.line + 1}, Col {user.cursor.column + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-gray-300 bg-black/20 rounded p-3">
            <p className="font-medium mb-2">Test Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Join the document above</li>
              <li>Open another browser tab and join the same document</li>
              <li>Start typing in either tab and watch changes sync in real-time</li>
              <li>Move your cursor around to see cursor position updates</li>
              <li>Notice how each user gets a unique color</li>
            </ol>
          </div>
        </div>
      )}

      {/* Document State Info */}
      {sharedText && (
        <div className="mt-4 text-xs text-gray-400">
          <p>Document length: {textContent.length} characters</p>
          <p>Yjs document ID: {sharedText.parent?.doc ? sharedText.parent.doc.guid : 'N/A'}</p>
        </div>
      )}
    </div>
  );
};