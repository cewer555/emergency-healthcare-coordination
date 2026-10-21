import { Router } from "express";
import { seedMockData } from "../services/seed.service";

const router = Router();

// POST /api/seed
router.post("/", async (_req, res, next) => {
  try {
    const result = await seedMockData();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/seed
router.get("/", async (_req, res, next) => {
  try {
    const result = await seedMockData();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
