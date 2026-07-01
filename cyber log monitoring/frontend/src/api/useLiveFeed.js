import { useEffect, useRef, useState } from "react";
import { WS_URL } from "./client";

/** Subscribes to the dashboard WebSocket and keeps a rolling buffer of
 * recent {type: "log"|"alert", ...} events pushed by the backend. */
export function useLiveFeed(maxItems = 100) {
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    let retryTimer;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          setEvents((prev) => [payload, ...prev].slice(0, maxItems));
        } catch {
          // ignore malformed payloads
        }
      };

      ws.onclose = () => {
        retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [maxItems]);

  return events;
}
