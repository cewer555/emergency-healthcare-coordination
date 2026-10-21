import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";
import type { WebSocketEventType, EventEnvelope } from "../types";

interface ExtendedClient extends WebSocket {
  isAlive?: boolean;
  hospitalId?: string;
  emergencyId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ExtendedClient>();

  public init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: ExtendedClient) => {
      ws.isAlive = true;
      this.clients.add(ws);

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (rawMessage) => {
        try {
          const message = JSON.parse(rawMessage.toString());
          if (message.action === "subscribe") {
            if (message.hospitalId) ws.hospitalId = message.hospitalId;
            if (message.emergencyId) ws.emergencyId = message.emergencyId;
            ws.send(
              JSON.stringify({
                type: "SUBSCRIBED",
                hospitalId: ws.hospitalId,
                emergencyId: ws.emergencyId,
                timestamp: new Date().toISOString(),
              })
            );
          }
        } catch {
          // ignore malformed message
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        console.error("WebSocket client error:", err);
        this.clients.delete(ws);
      });

      // Send initial handshake acknowledgement
      ws.send(
        JSON.stringify({
          type: "CONNECTION_ESTABLISHED",
          message: "Connected to Emergency Healthcare Coordination WebSocket Stream",
          timestamp: new Date().toISOString(),
        })
      );
    });

    // Heartbeat check every 30 seconds
    const interval = setInterval(() => {
      for (const ws of this.clients) {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, 30000);

    this.wss.on("close", () => {
      clearInterval(interval);
    });
  }

  public emitEvent<T = unknown>(params: {
    eventType: WebSocketEventType;
    entityType: string;
    entityId: string;
    version?: number;
    correlationId?: string;
    payload: T;
    hospitalId?: string;
    emergencyId?: string;
  }): EventEnvelope<T> {
    const envelope: EventEnvelope<T> = {
      event_id: randomUUID(),
      event_type: params.eventType,
      occurred_at: new Date().toISOString(),
      entity_type: params.entityType,
      entity_id: params.entityId,
      version: params.version ?? 1,
      correlation_id: params.correlationId || randomUUID(),
      payload: params.payload,
    };

    const serialized = JSON.stringify(envelope);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        // If client is filtered by hospitalId, match
        if (client.hospitalId && params.hospitalId && client.hospitalId !== params.hospitalId) {
          continue;
        }
        // If client is filtered by emergencyId, match
        if (client.emergencyId && params.emergencyId && client.emergencyId !== params.emergencyId) {
          continue;
        }

        try {
          client.send(serialized);
        } catch (err) {
          console.error("Failed to deliver websocket message to client:", err);
        }
      }
    }

    return envelope;
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
