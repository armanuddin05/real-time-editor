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

    // Broadcast the message to all connections in this document
    broadcastToDocument(documentId, {
      type,
      data,
      fromUserId: userId,
      timestamp: new Date().toISOString()
    }, userId);

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