"use client";

import { useState } from 'react';
import { useCollaborativeDocument } from '../hooks/useCollaborativeDocument';
import { MonacoEditor } from './MonacoEditor';

export const MonacoCollaborativeTest = () => {
  const { 
    isConnected, 
    error, 
    userId,
    yjsDoc,
    sharedText,
    joinDocument, 
    leaveDocument, 
    updateCursor,
    remoteUsers,
    currentDocumentId
  } = useCollaborativeDocument();
  
  const [documentId, setDocumentId] = useState('monaco-doc-123');
  const [language, setLanguage] = useState('typescript');

  const handleJoinDocument = () => {
    const initialContent = `// Welcome to collaborative coding!
// This is a real-time collaborative Monaco Editor
// Try opening multiple tabs and editing together

interface User {
  id: string;
  name: string;
  email: string;
}

class CollaborativeEditor {
  private users: Map<string, User> = new Map();
  
  constructor() {
    console.log('Collaborative editor initialized');
  }
  
  addUser(user: User): void {
    this.users.set(user.id, user);
    console.log(\`User \${user.name} joined the session\`);
  }
  
  removeUser(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      console.log(\`User \${user.name} left the session\`);
    }
  }
  
  getActiveUsers(): User[] {
    return Array.from(this.users.values());
  }
}

// Start editing and see your changes sync in real-time!
const editor = new CollaborativeEditor();
`;

    joinDocument(documentId, initialContent);
  };

  const handleLeaveDocument = () => {
    leaveDocument();
  };

  const handleCursorPositionChange = (position: { lineNumber: number; column: number }) => {
    // Convert 1-based Monaco coordinates to 0-based for our system
    updateCursor({
      line: position.lineNumber - 1,
      column: position.column - 1
    });
  };

  const handleSelectionChange = (selection: { 
    startLineNumber: number; 
    startColumn: number; 
    endLineNumber: number; 
    endColumn: number; 
  }) => {
    // Convert 1-based Monaco coordinates to 0-based for our system
    updateCursor(
      { line: selection.startLineNumber - 1, column: selection.startColumn - 1 },
      {
        start: { line: selection.startLineNumber - 1, column: selection.startColumn - 1 },
        end: { line: selection.endLineNumber - 1, column: selection.endColumn - 1 }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 p-6 bg-white/10 rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Collaborative Monaco Editor</h2>
      
      {/* Connection Status and Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
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
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Document Controls */}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Document ID:</label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-black"
              placeholder="Enter document ID"
              disabled={currentDocumentId !== null}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-black"
              disabled={currentDocumentId !== null}
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="markdown">Markdown</option>
              <option value="sql">SQL</option>
            </select>
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
      </div>

      {/* Monaco Editor */}
      {currentDocumentId && (
        <div className="space-y-4">
          <div className="border border-gray-600 rounded-lg overflow-hidden">
            <MonacoEditor
              yjsDoc={yjsDoc}
              sharedText={sharedText}
              language={language}
              theme="vs-dark"
              height="500px"
              remoteUsers={remoteUsers}
              onCursorPositionChange={handleCursorPositionChange}
              onSelectionChange={handleSelectionChange}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Active Users Display */}
          <div className="bg-black/20 rounded p-4">
            <h3 className="font-medium mb-3">Active Collaborators ({remoteUsers.length + 1}):</h3>
            
            <div className="flex flex-wrap gap-2">
              {/* Current user */}
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">You ({userId.substring(0, 6)})</span>
              </div>
              
              {/* Remote users */}
              {remoteUsers.map((user, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.user.color }}
                  />
                  <span className="text-sm">{user.user.name}</span>
                  {user.cursor && (
                    <span className="text-xs text-gray-400">
                      L{user.cursor.line + 1}:C{user.cursor.column + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-300 bg-black/20 rounded p-4">
            <h4 className="font-medium mb-2">Collaborative Features:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Real-time text synchronization across multiple users</li>
              <li>Live cursor positions and selections (colored by user)</li>
              <li>Automatic conflict resolution using Yjs CRDT</li>
              <li>User presence indicators in the top-right corner</li>
              <li>Full Monaco Editor features (IntelliSense, syntax highlighting, etc.)</li>
            </ul>
            
            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <p className="text-yellow-200 text-xs">
                <strong>Test it:</strong> Open this page in multiple browser tabs, join the same document, 
                and start editing to see real-time collaboration in action!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};