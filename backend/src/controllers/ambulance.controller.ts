import type { Request, Response, NextFunction } from "express";
import {
  getAllAmbulances,
  getAmbulanceById,
  createAmbulance,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
  syncOfflineQueue,
} from "../services/ambulance.service";
import { AppError } from "../middleware/error.middleware";

// GET /api/ambulances
export async function listAmbulancesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ambulances = await getAllAmbulances();
    res.status(200).json({
      success: true,
      count: ambulances.length,
      data: ambulances,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/ambulances/:ambulanceId
export async function getAmbulanceHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ambulanceId = String(req.params.ambulanceId);
    const ambulance = await getAmbulanceById(ambulanceId);

    if (!ambulance) {
      throw new AppError(404, "AMBULANCE_NOT_FOUND", "Ambulance not found");
    }

    res.status(200).json({
      success: true,
      data: ambulance,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ambulances
export async function createAmbulanceHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      registrationNo,
      status = "AVAILABLE",
      latitude,
      longitude,
      crewDetails,
      equipmentSummary,
    } = req.body;

    if (!registrationNo) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "registrationNo is required"
      );
    }

    const ambulance = await createAmbulance({
      registrationNo,
      status,
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      crewDetails,
      equipmentSummary,
    });

    res.status(201).json({
      success: true,
      message: "Ambulance registered successfully",
      data: ambulance,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/ambulances/:ambulanceId/location
export async function updateLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ambulanceId = String(req.params.ambulanceId);
    const { latitude, longitude, heading, speed } = req.body;

    if (latitude === undefined || longitude === undefined) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "latitude and longitude are required"
      );
    }

    const updated = await updateAmbulanceLocation(
      ambulanceId,
      {
        latitude: Number(latitude),
        longitude: Number(longitude),
        heading: heading !== undefined ? Number(heading) : undefined,
        speed: speed !== undefined ? Number(speed) : undefined,
      },
      req.correlationId
    );

    res.status(200).json({
      success: true,
      message: "Ambulance location updated",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/ambulances/:ambulanceId/status
export async function updateStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ambulanceId = String(req.params.ambulanceId);
    const { status } = req.body;

    if (!status) {
      throw new AppError(400, "VALIDATION_ERROR", "status is required");
    }

    const updated = await updateAmbulanceStatus(
      ambulanceId,
      status,
      req.correlationId
    );

    res.status(200).json({
      success: true,
      message: "Ambulance status updated",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ambulances/sync
export async function syncOfflineQueueHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const operations = req.body.operations || req.body;

    if (!Array.isArray(operations)) {
      throw new AppError(
        400,
        "INVALID_PAYLOAD",
        "Payload must be an array of operations or { operations: [...] }"
      );
    }

    const result = await syncOfflineQueue(operations);

    res.status(200).json({
      success: true,
      message: "Offline queue synchronized",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
