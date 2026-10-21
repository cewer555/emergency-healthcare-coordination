import { Router } from "express";
import {
  acceptRequestHandler,
  rejectRequestHandler,
} from "../controllers/handshake.controller";
import { requireRole } from "../middleware/auth.middleware";

const router = Router();

// POST /api/hospital-requests/:requestId/accept
router.post(
  "/:requestId/accept",
  requireRole("HOSPITAL_ER", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"),
  acceptRequestHandler
);

// POST /api/hospital-requests/:requestId/reject
router.post(
  "/:requestId/reject",
  requireRole("HOSPITAL_ER", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"),
  rejectRequestHandler
);

export default router;
