import type { Request, Response } from "express";
import {
  getAllHospitals,
  getHospitalById,
  createHospital,
} from "../services/hospital.service";

// GET /api/hospitals
export async function listHospitals(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const hospitals = await getAllHospitals();

    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals,
    });
  } catch (error) {
    console.error("Error fetching hospitals:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch hospitals",
    });
  }
}

// GET /api/hospitals/:hospitalId
export async function getHospital(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId ?? "");

    if (!hospitalId) {
      res.status(400).json({
        success: false,
        message: "Hospital ID is required",
      });
      return;
    }

    const hospital = await getHospitalById(hospitalId);

    if (!hospital) {
      res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: hospital,
    });
  } catch (error) {
    console.error("Error fetching hospital:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch hospital",
    });
  }
}

// POST /api/hospitals
export async function registerHospital(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      name,
      code,
      latitude,
      longitude,
      address,
      status,
      emergencyContact,
      timezone,
    } = req.body;

    if (
      !name ||
      !code ||
      latitude === undefined ||
      longitude === undefined ||
      !status ||
      !timezone
    ) {
      res.status(400).json({
        success: false,
        message:
          "Required fields: name, code, latitude, longitude, status, timezone",
      });
      return;
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
      return;
    }

    const hospital = await createHospital({
      name,
      code,
      latitude,
      longitude,
      address,
      status,
      emergencyContact,
      timezone,
    });

    res.status(201).json({
      success: true,
      message: "Hospital registered successfully",
      data: hospital,
    });
  } catch (error) {
    console.error("Error registering hospital:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register hospital",
    });
  }
}