import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";

// Middlewares
import { correlationIdMiddleware } from "./middleware/correlationId.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { idempotencyMiddleware } from "./middleware/idempotency.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

// Real-time WebSocket Service
import { wsService } from "./services/websocket.service";

// Handshake timeout worker
import { expireStaleHospitalRequests } from "./services/handshake.service";

// Route modules
import hospitalRoutes from "./routes/hospital.routes";
import patientRoutes from "./routes/patient.routes";
import ambulanceRoutes from "./routes/ambulance.routes";
import emergencyRoutes from "./routes/emergency.routes";
import handshakeRoutes from "./routes/handshake.routes";
import aiRoutes from "./routes/ai.routes";
import seedRoutes from "./routes/seed.routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Request Pipeline Middlewares
app.use(correlationIdMiddleware);
app.use(idempotencyMiddleware);
app.use(authMiddleware);

// API Endpoints
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/hospital-requests", handshakeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/seed", seedRoutes);

// System Health Checks
app.get(["/", "/health"], (_req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "Emergency Healthcare Coordination Backend",
    version: "1.0.0",
    wsClientsConnected: wsService.getConnectedClientsCount(),
    timestamp: new Date().toISOString(),
  });
});

// Central Error Handling Middleware per Blueprint Section 4 & 16
app.use(errorMiddleware);

// Create HTTP server and mount WebSocket service
const server = http.createServer(app);
wsService.init(server);

// Background Handshake Timeout Worker (Checks every 30 seconds)
const handshakeWorkerInterval = setInterval(async () => {
  try {
    const expired = await expireStaleHospitalRequests(3); // 3 minutes timeout
    if (expired.length > 0) {
      console.log(`[HANDSHAKE_WORKER] Expired ${expired.length} stale pending requests.`);
    }
  } catch (err) {
    console.error("[HANDSHAKE_WORKER] Error checking expired requests:", err);
  }
}, 30000);

// Start server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Emergency Healthcare Coordination API is online`);
  console.log(` HTTP REST API: http://localhost:${PORT}`);
  console.log(` WebSocket Stream: ws://localhost:${PORT}/ws`);
  console.log(`=======================================================`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  clearInterval(handshakeWorkerInterval);
  server.close(() => {
    process.exit(0);
  });
});

export default app;
