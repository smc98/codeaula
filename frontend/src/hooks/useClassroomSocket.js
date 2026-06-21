import { useEffect, useRef, useState } from "react";
import { getWebSocketUrl } from "../api/codeaula";

/**
 * Hook que mantiene una conexión WebSocket con el canal "classroom" y
 * reconecta automáticamente si se pierde la conexión (red del aula poco fiable).
 *
 * @param {(event: {event: string, alias: string}) => void} onMessage
 *   Callback invocado cada vez que llega un evento del servidor.
 * @returns {{connected: boolean}}
 */
export function useClassroomSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let cancelled = false;

    function connect() {
      socket = new WebSocket(getWebSocketUrl());

      socket.onopen = () => {
        if (cancelled) return;
        setConnected(true);
      };

      socket.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        // Reintenta cada 3 segundos: típico en redes de aula inestables.
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callbackRef.current?.(data);
        } catch {
          // Mensaje no JSON, se ignora.
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      if (socket) {
        if (socket.readyState === WebSocket.CONNECTING) {
          // Cerrar un socket todavía en handshake genera el warning del
          // navegador "WebSocket is closed before the connection is
          // established". Es inofensivo (típico con StrictMode en
          // desarrollo, que monta/desmonta dos veces), pero esperamos a
          // que abra para cerrarlo limpiamente y no ensuciar la consola.
          socket.addEventListener("open", () => socket.close(), { once: true });
        } else {
          socket.close();
        }
      }
    };
  }, []);

  return { connected };
}
