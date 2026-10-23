import React, { useEffect, useRef } from 'react';
import { WS_URL } from '../config/api';
import { useAppStore } from '../store/appStore';

type WsHandler = (data: Record<string, unknown>) => void;

let wsInstance: WebSocket | null = null;
const handlers = new Map<string, WsHandler[]>();

export function useWebSocket() {
  const ambulanceId = useAppStore((s) => s.ambulanceId);
  const setActiveEmergency = useAppStore((s) => s.setActiveEmergency);
  const activeEmergency = useAppStore((s) => s.activeEmergency);

  useEffect(() => {
    if (!ambulanceId) return;

    wsInstance = new WebSocket(WS_URL);

    wsInstance.onopen = () => {
      // Subscribe to ambulance-specific events
      wsInstance?.send(JSON.stringify({ action: 'subscribe' }));
    };

    wsInstance.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data);

        // Broadcast to all registered handlers
        const eventHandlers = handlers.get(envelope.event_type) ?? [];
        for (const h of eventHandlers) {
          h(envelope.payload);
        }

        // Built-in: update destination when hospital accepts
        if (envelope.event_type === 'HOSPITAL_REQUEST_ACCEPTED') {
          if (
            activeEmergency &&
            envelope.payload?.emergencyId === activeEmergency.emergencyCaseId
          ) {
            setActiveEmergency({
              ...activeEmergency,
              state: 'HOSPITAL_ACCEPTED',
              destinationHospitalId: envelope.payload?.hospitalId ?? null,
            });
          }
        }

        // Built-in: update state changes
        if (envelope.event_type === 'EMERGENCY_STATUS_UPDATED') {
          if (
            activeEmergency &&
            envelope.payload?.emergency_id === activeEmergency.emergencyCaseId
          ) {
            setActiveEmergency({
              ...activeEmergency,
              state: envelope.payload?.status ?? activeEmergency.state,
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    wsInstance.onerror = () => {
      // silently handle — reconnect logic is in reconnect hook
    };

    return () => {
      wsInstance?.close();
      wsInstance = null;
    };
  }, [ambulanceId]);
}

// Register event-specific listener
export function useWsEvent(eventType: string, handler: WsHandler) {
  useEffect(() => {
    const list = handlers.get(eventType) ?? [];
    list.push(handler);
    handlers.set(eventType, list);

    return () => {
      const updated = (handlers.get(eventType) ?? []).filter((h) => h !== handler);
      handlers.set(eventType, updated);
    };
  }, [eventType, handler]);
}
