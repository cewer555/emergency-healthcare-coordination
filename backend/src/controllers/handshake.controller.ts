import type { Request, Response, NextFunction } from "express";
import {
  acceptHospitalRequest,
  rejectHospitalRequest,
} from "../services/handshake.service";
import { evaluateDynamicReroute } from "../services/rerouting.service";

// POST /api/hospital-requests/:requestId/accept
export async function acceptRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestId = String(req.params.requestId);
    const actorId = req.user?.id || "hospital_er_staff";

    const result = await acceptHospitalRequest(
      requestId,
      actorId,
      req.correlationId
    );

    res.status(200).json({
      success: true,
      message: "Hospital request accepted and resources reserved",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/hospital-requests/:requestId/reject
export async function rejectRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestId = String(req.params.requestId);
    const reason = req.body.reason || "Hospital ER unable to accept case";
    const actorId = req.user?.id || "hospital_er_staff";

    const updated = await rejectHospitalRequest(
      requestId,
      reason,
      actorId,
      req.correlationId
    );

    // Trigger dynamic rerouting automatically upon hospital rejection
    const rerouteResult = await evaluateDynamicReroute(
      updated.emergencyCaseId,
      `Hospital ${updated.hospitalId} rejected request: ${reason}`,
      req.correlationId
    );

    res.status(200).json({
      success: true,
      message: "Hospital request rejected",
      data: updated,
      dynamicReroute: rerouteResult,
    });
  } catch (error) {
    next(error);
  }
}
