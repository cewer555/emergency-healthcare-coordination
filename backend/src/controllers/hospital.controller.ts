import type { Request, Response, NextFunction } from "express";
import {
  getAllHospitals,
  getHospitalById,
  createHospital,
  getHospitalResources,
  updateHospitalResources,
  getHospitalCapabilities,
  updateHospitalCapabilities,
} from "../services/hospital.service";
import { forecastCapacity } from "../services/ai.service";
import { AppError } from "../middleware/error.middleware";

// GET /api/hospitals
export async function listHospitals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const hospitals = await getAllHospitals({ status });

    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/hospitals/:hospitalId
export async function getHospital(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId ?? "");

    if (!hospitalId) {
      throw new AppError(400, "MISSING_PARAM", "Hospital ID is required");
    }

    const hospital = await getHospitalById(hospitalId);

    if (!hospital) {
      throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital not found");
    }

    res.status(200).json({
      success: true,
      data: hospital,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/hospitals
export async function registerHospital(
  req: Request,
  res: Response,
  next: NextFunction
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
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Required fields: name, code, latitude, longitude, status, timezone"
      );
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new AppError(400, "INVALID_COORDINATES", "Invalid latitude or longitude");
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
    next(error);
  }
}

// GET /api/hospitals/:hospitalId/resources
export async function getResources(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId);
    const resources = await getHospitalResources(hospitalId);

    res.status(200).json({
      success: true,
      hospital_id: hospitalId,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/hospitals/:hospitalId/resources
export async function updateResources(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId);
    const resources = req.body.resources || req.body;

    if (!Array.isArray(resources)) {
      throw new AppError(
        400,
        "INVALID_PAYLOAD",
        "Payload must be an array of resources or { resources: [...] }"
      );
    }

    const updated = await updateHospitalResources(
      hospitalId,
      resources,
      req.correlationId
    );

    res.status(200).json({
      success: true,
      message: "Hospital resources updated successfully",
      hospital_id: hospitalId,
      count: updated.length,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/hospitals/:hospitalId/capabilities
export async function getCapabilities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId);
    const capabilities = await getHospitalCapabilities(hospitalId);

    res.status(200).json({
      success: true,
      hospital_id: hospitalId,
      count: capabilities.length,
      data: capabilities,
    });
  } catch (error) {
    next(error);
  }
}

// PUT / POST /api/hospitals/:hospitalId/capabilities
export async function updateCapabilities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId);
    const capabilities = req.body.capabilities || req.body;

    if (!Array.isArray(capabilities)) {
      throw new AppError(
        400,
        "INVALID_PAYLOAD",
        "Payload must be an array of capabilities"
      );
    }

    const updated = await updateHospitalCapabilities(hospitalId, capabilities);

    res.status(200).json({
      success: true,
      message: "Hospital capabilities updated successfully",
      hospital_id: hospitalId,
      count: updated.length,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/hospitals/:hospitalId/resources/forecast
export async function getForecast(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hospitalId = String(req.params.hospitalId);
    const resourceType = (req.query.type as string) || "ICU";

    const forecast = await forecastCapacity(hospitalId, resourceType);

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
}