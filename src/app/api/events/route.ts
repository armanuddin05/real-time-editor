import { type NextRequest } from "next/server";

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId') || 'default';
  const userId = searchParams.get('userId') || Math.random().toString(36).substr(2, 9);

  const stream = new ReadableStream({
    start(controller) {
      // Store this connection
      connections.set(`${documentId}-${userId}`, controller);

      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connected',
        userId,
        documentId,
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(data));

      // Notify other users that this user joined
      broadcastToDocument(documentId, {
        type: 'user-joined',
        userId,
        timestamp: new Date().toISOString()
      }, userId);

      console.log(`User ${userId} connected to document ${documentId}`);
    },
    cancel() {
      // Clean up when connection closes
      connections.delete(`${documentId}-${userId}`);
      
      // Notify other users that this user left
      broadcastToDocument(documentId, {
        type: 'user-left',
        userId,
        timestamp: new Date().toISOString()
      }, userId);

      console.log(`User ${userId} disconnected from document ${documentId}`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, type, data, userId } = body;

    console.log(`Received ${type} message from ${userId} for document ${documentId}`);

    // Handle different message types
    switch (type) {
      case 'document-update':
        // Broadcast Yjs document updates to all users in the document
        broadcastToDocument(documentId, {
          type: 'document-update',
          data,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        }, userId);
        break;

      case 'cursor-update':
        // Broadcast cursor/selection updates
        broadcastToDocument(documentId, {
          type: 'cursor-update',
          data,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        }, userId);
        break;

      case 'document-state-request':
        // Broadcast request for current document state to all users
        broadcastToDocument(documentId, {
          type: 'document-state-request',
          data,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        }, userId);
        break;

      case 'document-state-response':
        // Send document state response directly to requesting user
        if (data && typeof data === 'object' && 'forUserId' in data) {
          const { forUserId } = data as { forUserId: string };
          broadcastToUser(documentId, forUserId, {
            type: 'document-state-response',
            data,
            fromUserId: userId,
            timestamp: new Date().toISOString()
          });
        } else {
          // Fallback: broadcast to all users
          broadcastToDocument(documentId, {
            type: 'document-state-response',
            data,
            fromUserId: userId,
            timestamp: new Date().toISOString()
          }, userId);
        }
        break;

      default:
        // Handle other message types (chat, etc.)
        broadcastToDocument(documentId, {
          type,
          data,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        }, userId);
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error handling SSE POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function broadcastToDocument(documentId: string, message: unknown, excludeUserId?: string) {
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;
  const encoded = new TextEncoder().encode(messageStr);

  for (const [connectionId, controller] of connections.entries()) {
    if (connectionId.startsWith(`${documentId}-`)) {
      // Don't send to the sender
      if (excludeUserId && connectionId.endsWith(`-${excludeUserId}`)) {
        continue;
      }
      
      try {
        controller.enqueue(encoded);
      } catch (error) {
        console.error('Error sending to connection:', error);
        connections.delete(connectionId);
      }
    }
  }
}

function broadcastToUser(documentId: string, targetUserId: string, message: unknown) {
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;
  const encoded = new TextEncoder().encode(messageStr);
  const targetConnectionId = `${documentId}-${targetUserId}`;

  const controller = connections.get(targetConnectionId);
  if (controller) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      console.error('Error sending to specific user:', error);
      connections.delete(targetConnectionId);
    }
  }
}