import { Router } from "express";
import {
  createEmergencyHandler,
  listEmergenciesHandler,
  getEmergencyHandler,
  updateEmergencyHandler,
  createHospitalRequestHandler,
  getHospitalRequestsHandler,
  matchHospitalsHandler,
} from "../controllers/emergency.controller";
import { requireRole } from "../middleware/auth.middleware";

const router = Router();

// POST /api/emergencies
router.post(
  "/",
  requireRole(
    "PARAMEDIC",
    "AMBULANCE_CONTROL",
    "STATE_COMMAND_CENTER",
    "SYSTEM_ADMIN"
  ),
  createEmergencyHandler
);

// GET /api/emergencies
router.get("/", listEmergenciesHandler);

// GET /api/emergencies/:emergencyId
router.get("/:emergencyId", getEmergencyHandler);

// PUT /api/emergencies/:emergencyId
router.put(
  "/:emergencyId",
  requireRole(
    "PARAMEDIC",
    "AMBULANCE_CONTROL",
    "HOSPITAL_ER",
    "STATE_COMMAND_CENTER",
    "SYSTEM_ADMIN"
  ),
  updateEmergencyHandler
);

// POST /api/emergencies/:emergencyId/hospital-request
router.post(
  "/:emergencyId/hospital-request",
  requireRole(
    "PARAMEDIC",
    "AMBULANCE_CONTROL",
    "STATE_COMMAND_CENTER",
    "SYSTEM_ADMIN"
  ),
  createHospitalRequestHandler
);

// GET /api/emergencies/:emergencyId/hospital-requests
router.get("/:emergencyId/hospital-requests", getHospitalRequestsHandler);

// POST /api/emergencies/:emergencyId/match
router.post("/:emergencyId/match", matchHospitalsHandler);

// GET /api/emergencies/:emergencyId/candidates
router.get("/:emergencyId/candidates", matchHospitalsHandler);

export default router;
