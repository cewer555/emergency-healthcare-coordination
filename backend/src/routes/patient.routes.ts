import { Router } from "express";
import {
  createPatientHandler,
  getPatientHandler,
  updatePatientHandler,
  appendVitalReadingHandler,
  getPatientVitalsHandler,
} from "../controllers/patient.controller";
import { requireRole } from "../middleware/auth.middleware";

const router = Router();

// POST /api/patients
router.post(
  "/",
  requireRole("PARAMEDIC", "HOSPITAL_ER", "AMBULANCE_CONTROL", "SYSTEM_ADMIN"),
  createPatientHandler
);

// GET /api/patients/:patientId
router.get("/:patientId", getPatientHandler);

// PUT /api/patients/:patientId
router.put(
  "/:patientId",
  requireRole("PARAMEDIC", "HOSPITAL_ER", "SYSTEM_ADMIN"),
  updatePatientHandler
);

// POST /api/patients/:patientId/vitals
router.post(
  "/:patientId/vitals",
  requireRole("PARAMEDIC", "HOSPITAL_ER", "SYSTEM_ADMIN"),
  appendVitalReadingHandler
);

// GET /api/patients/:patientId/vitals
router.get("/:patientId/vitals", getPatientVitalsHandler);

export default router;
