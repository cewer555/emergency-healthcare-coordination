import type { Request, Response, NextFunction } from "express";
import {
  createEmergency,
  getAllEmergencies,
  getEmergencyById,
  updateEmergency,
  getEmergencyHospitalRequests,
} from "../services/emergency.service";
import { findCandidateHospitals } from "../services/matching.service";
import { createHospitalRequest } from "../services/handshake.service";
import { AppError } from "../middleware/error.middleware";

// POST /api/emergencies
export async function createEmergencyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await createEmergency(req.body, req.correlationId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

// GET /api/emergencies
export async function listEmergenciesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = (req.query.status || req.query.state) as string | undefined;
    const priority = req.query.priority as string | undefined;

    const cases = await getAllEmergencies({ status, priority });

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/emergencies/:emergencyId
export async function getEmergencyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emergencyId = String(req.params.emergencyId);
    const emergencyCase = await getEmergencyById(emergencyId);

    if (!emergencyCase) {
      throw new AppError(404, "EMERGENCY_NOT_FOUND", "Emergency case not found");
    }

    res.status(200).json({
      success: true,
      data: emergencyCase,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/emergencies/:emergencyId
export async function updateEmergencyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emergencyId = String(req.params.emergencyId);
    const actor = req.user ? { id: req.user.id, role: req.user.role } : undefined;

    const updated = await updateEmergency(
      emergencyId,
      req.body,
      actor,
      req.correlationId
    );

    res.status(200).json({
      success: true,
      message: "Emergency case updated",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/emergencies/:emergencyId/hospital-request
export async function createHospitalRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emergencyId = String(req.params.emergencyId);
    const { hospital_id, hospitalId, requested_resources, requestedResources } = req.body;

    const targetHospitalId = hospitalId || hospital_id;
    if (!targetHospitalId) {
      throw new AppError(400, "VALIDATION_ERROR", "hospital_id is required");
    }

    const resources = requestedResources || requested_resources;

    const request = await createHospitalRequest({
      emergencyCaseId: emergencyId,
      hospitalId: targetHospitalId,
      requestedResources: resources,
      actorId: req.user?.id,
      correlationId: req.correlationId,
    });

    res.status(201).json({
      success: true,
      message: "Hospital request initiated",
      data: request,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/emergencies/:emergencyId/hospital-requests
export async function getHospitalRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emergencyId = String(req.params.emergencyId);
    const requests = await getEmergencyHospitalRequests(emergencyId);

    res.status(200).json({
      success: true,
      emergency_id: emergencyId,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/emergencies/:emergencyId/match
export async function matchHospitalsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emergencyId = String(req.params.emergencyId);
    const emergency = await getEmergencyById(emergencyId);

    if (!emergency) {
      throw new AppError(404, "EMERGENCY_NOT_FOUND", "Emergency case not found");
    }

    const originLat =
      req.body.originLat ??
      emergency.currentLatitude ??
      13.08;
    const originLon =
      req.body.originLon ??
      emergency.currentLongitude ??
      80.27;

    let requiredResources: Array<{ type: string; quantity: number }> = [];
    if (req.body.requiredResources) {
      requiredResources = req.body.requiredResources;
    } else if (emergency.requiredResources) {
      try {
        requiredResources = JSON.parse(emergency.requiredResources);
      } catch {
        requiredResources = [{ type: "EMERGENCY_BED", quantity: 1 }];
      }
    }

    const candidates = await findCandidateHospitals({
      originLat,
      originLon,
      requiredResources,
      requiredCapabilities: req.body.requiredCapabilities,
      maxEtaMinutes: req.body.maxEtaMinutes,
    });

    res.status(200).json({
      success: true,
      emergency_id: emergencyId,
      origin: { lat: originLat, lon: originLon },
      candidate_count: candidates.length,
      eligible_count: candidates.filter((c) => c.eligible).length,
      candidates,
    });
  } catch (error) {
    next(error);
  }
}
