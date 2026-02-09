// Server-Sent Events (SSE) utilities for real-time dashboard updates

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
};

// In-memory store of connected SSE clients
const clients = new Map<string, SSEClient>();

/**
 * Create a new SSE connection
 */
export function createSSEStream(clientId: string): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Store client connection
      clients.set(clientId, { id: clientId, controller, encoder });

      // Send initial connection message
      const data = JSON.stringify({ type: "connected", clientId });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
          clients.delete(clientId);
        }
      }, 30000);

      // Clean up on close
      return () => {
        clearInterval(heartbeat);
        clients.delete(clientId);
      };
    },
    cancel() {
      clients.delete(clientId);
    },
  });
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcast(event: { type: string; data: any }) {
  const message = JSON.stringify(event);
  const payload = `data: ${message}\n\n`;

  clients.forEach((client) => {
    try {
      client.controller.enqueue(client.encoder.encode(payload));
    } catch (error) {
      console.error(`Failed to send to client ${client.id}:`, error);
      clients.delete(client.id);
    }
  });
}

/**
 * Send event to specific client
 */
export function sendToClient(clientId: string, event: { type: string; data: any }) {
  const client = clients.get(clientId);
  if (!client) {
    return false;
  }

  const message = JSON.stringify(event);
  const payload = `data: ${message}\n\n`;

  try {
    client.controller.enqueue(client.encoder.encode(payload));
    return true;
  } catch (error) {
    console.error(`Failed to send to client ${clientId}:`, error);
    clients.delete(clientId);
    return false;
  }
}

/**
 * Get count of connected clients
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Disconnect a specific client
 */
export function disconnectClient(clientId: string): boolean {
  const client = clients.get(clientId);
  if (client) {
    try {
      client.controller.close();
    } catch (error) {
      // ignore
    }
    clients.delete(clientId);
    return true;
  }
  return false;
}

/**
 * Disconnect all clients
 */
export function disconnectAll() {
  clients.forEach((client) => {
    try {
      client.controller.close();
    } catch (error) {
      // ignore
    }
  });
  clients.clear();
}
