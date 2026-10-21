import { Router } from "express";
import {
  patientRequirementsHandler,
  deteriorationRiskHandler,
  capacityForecastHandler,
  massCasualtyHandler,
  commandAssistantHandler,
  ecgAssistanceHandler,
  voiceNormalizationHandler,
} from "../controllers/ai.controller";

const router = Router();

// POST /api/ai/patient-requirements (Section 9.1)
router.post("/patient-requirements", patientRequirementsHandler);

// POST /api/ai/deterioration-risk (Section 9.2)
router.post("/deterioration-risk", deteriorationRiskHandler);

// POST /api/ai/capacity-forecast (Section 9.3)
router.post("/capacity-forecast", capacityForecastHandler);

// POST /api/ai/ecg (Section 9.4)
router.post("/ecg", ecgAssistanceHandler);

// POST /api/ai/voice (Section 9.5)
router.post("/voice", voiceNormalizationHandler);

// POST /api/ai/mass-casualty (Section 9.6)
router.post("/mass-casualty", massCasualtyHandler);

// POST /api/ai/command-assistant (Section 9.7)
router.post("/command-assistant", commandAssistantHandler);

export default router;
