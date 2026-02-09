"use client";

import { useEffect, useRef, useState } from "react";

interface SSEOptions {
  onMessage?: (event: any) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  enabled?: boolean;
}

export function useSSE(url: string, options: SSEOptions = {}) {
  const { onMessage, onError, onConnect, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Create EventSource connection
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    // Handle messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    // Handle errors
    eventSource.onerror = (error) => {
      setIsConnected(false);
      onError?.(error);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [url, enabled, onMessage, onError, onConnect]);

  return { isConnected };
}
