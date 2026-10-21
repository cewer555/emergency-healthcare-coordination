import { Router } from "express";
import {
  listAmbulancesHandler,
  getAmbulanceHandler,
  createAmbulanceHandler,
  updateLocationHandler,
  updateStatusHandler,
  syncOfflineQueueHandler,
} from "../controllers/ambulance.controller";
import { requireRole } from "../middleware/auth.middleware";

const router = Router();

// GET /api/ambulances
router.get("/", listAmbulancesHandler);

// POST /api/ambulances
router.post(
  "/",
  requireRole("AMBULANCE_CONTROL", "SYSTEM_ADMIN"),
  createAmbulanceHandler
);

// GET /api/ambulances/:ambulanceId
router.get("/:ambulanceId", getAmbulanceHandler);

// PUT /api/ambulances/:ambulanceId/location
router.put(
  "/:ambulanceId/location",
  requireRole("PARAMEDIC", "AMBULANCE_CONTROL", "SYSTEM_ADMIN"),
  updateLocationHandler
);

// PUT /api/ambulances/:ambulanceId/status
router.put(
  "/:ambulanceId/status",
  requireRole("PARAMEDIC", "AMBULANCE_CONTROL", "SYSTEM_ADMIN"),
  updateStatusHandler
);

// POST /api/ambulances/sync (Offline queue synchronization per Section 14)
router.post(
  "/sync",
  requireRole("PARAMEDIC", "AMBULANCE_CONTROL", "SYSTEM_ADMIN"),
  syncOfflineQueueHandler
);

export default router;
