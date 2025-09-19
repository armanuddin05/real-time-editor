import { useEffect, useState, useRef, useCallback } from 'react';
import { useSSE } from './useSSE';
import { YjsDocumentSync } from '../lib/yjsDocumentSync';
import type * as Y from 'yjs';

interface UseCollaborativeDocumentReturn {
  // SSE connection state
  isConnected: boolean;
  error: string | null;
  userId: string;
  
  // Yjs document
  yjsDoc: Y.Doc | null;
  sharedText: Y.Text | null;
  documentSync: YjsDocumentSync | null;
  
  // Document management
  joinDocument: (documentId: string, initialContent?: string) => void;
  leaveDocument: () => void;
  
  // Awareness (user presence)
  updateCursor: (position: { line: number; column: number }, selection?: { start: { line: number; column: number }; end: { line: number; column: number } }) => void;
  remoteUsers: Array<{
    user: { name: string; color: string; id: string };
    cursor?: { line: number; column: number };
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  }>;
  
  // Document state
  currentDocumentId: string | null;
}

export const useCollaborativeDocument = (): UseCollaborativeDocumentReturn => {
  const { 
    isConnected, 
    error, 
    messages, 
    userId, 
    joinDocument: joinSSEDocument, 
    leaveDocument: leaveSSEDocument,
    sendMessage 
  } = useSSE();

  const [documentSync, setDocumentSync] = useState<YjsDocumentSync | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Array<{
    user: { name: string; color: string; id: string };
    cursor?: { line: number; column: number };
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  }>>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  const documentSyncRef = useRef<YjsDocumentSync | null>(null);

  // Handle incoming SSE messages
  useEffect(() => {
    if (!documentSyncRef.current) return;

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    switch (latestMessage.type) {
      case 'document-update':
        // Apply remote Yjs update
        if (latestMessage.data && typeof latestMessage.data === 'object' && 'update' in latestMessage.data) {
          const updateData = latestMessage.data as { update: number[] };
          const update = new Uint8Array(updateData.update);
          documentSyncRef.current.applyRemoteUpdate(update);
        }
        break;

      case 'cursor-update':
        // Update remote user cursor position
        if (latestMessage.fromUserId && latestMessage.data && typeof latestMessage.data === 'object') {
          const cursorData = latestMessage.data as { position: { line: number; column: number }; selection?: { start: { line: number; column: number }; end: { line: number; column: number } } };
          documentSyncRef.current.applyRemoteAwareness({
            userId: latestMessage.fromUserId,
            cursor: cursorData.position,
            selection: cursorData.selection
          });
          
          // Update remote users state
          setRemoteUsers(documentSyncRef.current.getRemoteAwareness());
        }
        break;

      case 'user-left':
        // Remove user awareness when they leave
        if (latestMessage.userId) {
          documentSyncRef.current.removeUserAwareness(latestMessage.userId);
          setRemoteUsers(documentSyncRef.current.getRemoteAwareness());
        }
        break;

      case 'document-state-request':
        // Send current document state to newly joined user
        if (latestMessage.fromUserId && latestMessage.fromUserId !== userId) {
          const state = documentSyncRef.current.getDocumentState();
          void sendMessage('document-state-response', { 
            state: Array.from(state),
            forUserId: latestMessage.fromUserId 
          });
        }
        break;

      case 'document-state-response':
        // Apply initial document state (for newly joined users)
        if (latestMessage.data && typeof latestMessage.data === 'object' && 'state' in latestMessage.data && 'forUserId' in latestMessage.data) {
          const stateData = latestMessage.data as { state: number[]; forUserId: string };
          if (stateData.forUserId === userId) {
            const state = new Uint8Array(stateData.state);
            documentSyncRef.current.applyInitialState(state);
          }
        }
        break;
    }
  }, [messages, userId, sendMessage]);

  const joinDocument = useCallback(async (documentId: string, initialContent?: string) => {
    // Leave current document if any
    if (documentSyncRef.current) {
      documentSyncRef.current.dispose();
      documentSyncRef.current = null;
      setDocumentSync(null);
    }

    // Join SSE document channel
    joinSSEDocument(documentId);
    setCurrentDocumentId(documentId);

    // Create new Yjs document sync
    const newDocumentSync = new YjsDocumentSync({
      documentId,
      userId,
      onSendUpdate: (update: Uint8Array) => {
        // Send Yjs updates through SSE
        void sendMessage('document-update', { update: Array.from(update) });
      },
      onAwarenessUpdate: (awareness: Uint8Array) => {
        // Send awareness updates through SSE
        try {
          const awarenessData = JSON.parse(new TextDecoder().decode(awareness));
          void sendMessage('cursor-update', awarenessData);
        } catch (error) {
          console.error('Error sending awareness update:', error);
        }
      }
    });

    documentSyncRef.current = newDocumentSync;
    setDocumentSync(newDocumentSync);

    // Set initial content if provided
    if (initialContent) {
      newDocumentSync.setTextContent(initialContent);
    }

    // Request current document state from other users (if any)
    // Wait a bit for SSE connection to establish
    setTimeout(() => {
      void sendMessage('document-state-request', { userId });
    }, 1000);

    console.log(`Joined collaborative document: ${documentId}`);
  }, [joinSSEDocument, userId, sendMessage]);

  const leaveDocument = useCallback(() => {
    if (documentSyncRef.current) {
      documentSyncRef.current.dispose();
      documentSyncRef.current = null;
      setDocumentSync(null);
    }
    
    leaveSSEDocument();
    setCurrentDocumentId(null);
    setRemoteUsers([]);
    
    console.log('Left collaborative document');
  }, [leaveSSEDocument]);

  const updateCursor = useCallback((
    position: { line: number; column: number }, 
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
  ) => {
    if (documentSyncRef.current) {
      documentSyncRef.current.setLocalAwareness(position, selection);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (documentSyncRef.current) {
        documentSyncRef.current.dispose();
      }
    };
  }, []);

  return {
    // SSE connection state
    isConnected,
    error,
    userId,
    
    // Yjs document
    yjsDoc: documentSync?.getDocument() || null,
    sharedText: documentSync?.getSharedText() || null,
    documentSync,
    
    // Document management
    joinDocument,
    leaveDocument,
    
    // Awareness
    updateCursor,
    remoteUsers,
    
    // Document state
    currentDocumentId,
  };
};