import { useEffect, useState, useRef, useCallback } from 'react';

interface SSEMessage {
  type: string;
  userId?: string;
  fromUserId?: string;
  documentId?: string;
  data?: unknown;
  timestamp: string;
}

interface UseSSEReturn {
  isConnected: boolean;
  error: string | null;
  messages: SSEMessage[];
  userId: string;
  // Helper functions
  joinDocument: (documentId: string) => void;
  leaveDocument: () => void;
  sendMessage: (type: string, data: unknown) => void;
  sendDocumentChange: (change: unknown) => void;
  sendCursorUpdate: (position: { line: number; column: number }, selection?: { start: { line: number; column: number }; end: { line: number; column: number } }) => void;
  sendUserTyping: (isTyping: boolean) => void;
}

export const useSSE = (): UseSSEReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [userId] = useState(() => Math.random().toString(36).substr(2, 9));
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentDocumentRef = useRef<string | null>(null);

  const joinDocument = useCallback((documentId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    currentDocumentRef.current = documentId;
    
    // Create new EventSource connection
    const eventSource = new EventSource(`/api/events?documentId=${documentId}&userId=${userId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: string = event.data as string;
        const message: SSEMessage = JSON.parse(data) as SSEMessage;
        console.log('SSE message received:', message);
        
        setMessages(prev => [...prev.slice(-49), message]); // Keep last 50 messages
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Connection error occurred');
      setIsConnected(false);
    };

    console.log(`Joining document: ${documentId}`);
  }, [userId]);

  const leaveDocument = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    currentDocumentRef.current = null;
    setMessages([]);
    console.log('Left document');
  }, []);

  const sendMessage = useCallback(async (type: string, data: unknown) => {
    if (!currentDocumentRef.current) {
      console.warn('No document joined');
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: currentDocumentRef.current,
          type,
          data,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [userId]);

  const sendDocumentChange = useCallback((change: unknown) => {
  sendMessage('document-change', change).catch(console.error);
}, [sendMessage]);

const sendCursorUpdate = useCallback((
  position: { line: number; column: number },
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
) => {
  sendMessage('cursor-update', { position, selection }).catch(console.error);
}, [sendMessage]);

const sendUserTyping = useCallback((isTyping: boolean) => {
  sendMessage('user-typing', { isTyping }).catch(console.error);
}, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    error,
    messages,
    userId,
    joinDocument,
    leaveDocument,
    sendMessage,
    sendDocumentChange,
    sendCursorUpdate,
    sendUserTyping,
  };
};