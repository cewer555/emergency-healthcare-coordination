import { Router } from "express";
import {
  listHospitals,
  getHospital,
  registerHospital,
  getResources,
  updateResources,
  getCapabilities,
  updateCapabilities,
  getForecast,
} from "../controllers/hospital.controller";
import { requireRole } from "../middleware/auth.middleware";

const router = Router();

// GET /api/hospitals
router.get("/", listHospitals);

// POST /api/hospitals
router.post(
  "/",
  requireRole("HOSPITAL_ADMIN", "SYSTEM_ADMIN", "STATE_COMMAND_CENTER"),
  registerHospital
);

// GET /api/hospitals/:hospitalId
router.get("/:hospitalId", getHospital);

// GET /api/hospitals/:hospitalId/resources
router.get("/:hospitalId/resources", getResources);

// PUT /api/hospitals/:hospitalId/resources
router.put(
  "/:hospitalId/resources",
  requireRole("HOSPITAL_ER", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"),
  updateResources
);

// GET /api/hospitals/:hospitalId/capabilities
router.get("/:hospitalId/capabilities", getCapabilities);

// PUT /api/hospitals/:hospitalId/capabilities
router.put(
  "/:hospitalId/capabilities",
  requireRole("HOSPITAL_ADMIN", "SYSTEM_ADMIN"),
  updateCapabilities
);

// POST /api/hospitals/:hospitalId/capabilities
router.post(
  "/:hospitalId/capabilities",
  requireRole("HOSPITAL_ADMIN", "SYSTEM_ADMIN"),
  updateCapabilities
);

// GET /api/hospitals/:hospitalId/resources/forecast
router.get("/:hospitalId/resources/forecast", getForecast);

export default router;