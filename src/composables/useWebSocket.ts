import { readonly, ref } from "vue";
import type { ConnectionStatus, DataSource, RaceData } from "../models";

const WS_URL = "wss://livetiming.azurewebsites.net/";
const DEFAULT_EVENT_ID = "20";
const INITIAL_PID = [0];
const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30000;

let configuredEventId = DEFAULT_EVENT_ID;

export function setEventId(id: string) {
  configuredEventId = id;
}

export function getEventId(): string {
  return configuredEventId;
}

export function useWebSocket(onMessage: (data: RaceData) => void): DataSource {
  const connectionStatus = ref<ConnectionStatus>("disconnected");
  let ws: WebSocket | null = null;
  let reconnectDelay = RECONNECT_BASE;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let currentEventPid: number[] | null = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;
    cleanup();
    connectionStatus.value =
      connectionStatus.value === "disconnected"
        ? "disconnected"
        : "reconnecting";

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      connectionStatus.value = "connected";
      reconnectDelay = RECONNECT_BASE;
      currentEventPid = INITIAL_PID;
      const sub = {
        eventId: configuredEventId,
        eventPid: INITIAL_PID,
        clientLocalTime: Date.now(),
      };
      ws!.send(JSON.stringify(sub));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.PID === "LTS_TIMESYNC") {
          if (
            data.eventPid &&
            JSON.stringify(data.eventPid) !== JSON.stringify(currentEventPid)
          ) {
            currentEventPid = data.eventPid;
            const sub = {
              eventId: configuredEventId,
              eventPid: data.eventPid,
              clientLocalTime: Date.now(),
            };
            ws!.send(JSON.stringify(sub));
          }
          return;
        }

        if (
          data.RESULT ||
          data.LEADING ||
          data.BESTLAPS ||
          data.CUP ||
          data.HEAT ||
          data.TRACKNAME
        ) {
          onMessage(data as RaceData);
        }
      } catch (e) {
        console.warn("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      if (destroyed) return;
      connectionStatus.value = "reconnecting";
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  }

  function scheduleReconnect() {
    if (destroyed) return;
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
      connect();
    }, reconnectDelay);
  }

  function cleanup() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
      ws = null;
    }
  }

  function destroy() {
    destroyed = true;
    cleanup();
    connectionStatus.value = "disconnected";
  }

  return {
    connectionStatus: readonly(connectionStatus),
    connect,
    destroy,
  };
}
