import { Router } from "express";
import {
  listHospitals,
  getHospital,
  registerHospital,
} from "../controllers/hospital.controller";
const router = Router();

// GET /api/hospitals
router.get("/", listHospitals);

// GET /api/hospitals/:hospitalId
router.get("/:hospitalId", getHospital);

// POST /api/hospitals
router.post("/", registerHospital);


export default router;