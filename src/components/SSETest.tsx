"use client";

import { useState } from 'react';
import { useSSE } from '../hooks/useSSE';

export const SSETest = () => {
  const { 
    isConnected, 
    error, 
    messages, 
    userId,
    joinDocument, 
    leaveDocument, 
    sendDocumentChange,
    sendMessage 
  } = useSSE();
  
  const [documentId, setDocumentId] = useState('test-document-123');
  const [testMessage, setTestMessage] = useState('');

  const handleJoinDocument = () => {
    joinDocument(documentId);
  };

  const handleLeaveDocument = () => {
    leaveDocument();
  };

  const handleSendChange = () => {
    sendDocumentChange({ text: testMessage, type: 'test' });
    setTestMessage('');
  };

  const handleSendMessage = () => {
    void sendMessage('chat', { message: testMessage });
    setTestMessage('');
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white/10 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Real-time Connection Test</h2>
      
      {/* Connection Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <p className="text-sm text-gray-300 mt-1">Your ID: {userId}</p>
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
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleJoinDocument}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Join Document
          </button>
          <button
            onClick={handleLeaveDocument}
            disabled={!isConnected}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Leave Document
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Test Message:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-black"
              placeholder="Enter test message"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendChange}
              disabled={!(isConnected ?? false) || !(testMessage.trim() ?? '')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Change
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!(isConnected ?? false) || !(testMessage.trim() ?? '')}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages Display */}
      <div className="bg-black/20 rounded p-4 h-64 overflow-y-auto">
        <h3 className="font-medium mb-2">Messages:</h3>
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm">No messages yet. Join a document and send some messages!</p>
        ) : (
          <div className="space-y-2">
            {messages.slice(-10).map((message, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-400">
                  [{new Date(message.timestamp).toLocaleTimeString()}]
                </span>
                <span className="text-blue-300 ml-2">{message.type}:</span>
                <span className="ml-2">
                  {message.fromUserId && <span className="text-yellow-300">from {message.fromUserId}: </span>}
                  {JSON.stringify(message.data ?? message.userId ?? 'connection event')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-300">
        <p>1. Join a document</p>
        <p>2. Open another browser tab and join the same document</p>
        <p>3. Send messages and see them appear in both tabs in real-time</p>
        <p>4. Watch the console for detailed logs</p>
      </div>
    </div>
  );
};