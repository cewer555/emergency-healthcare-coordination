import { db } from "../prisma/db";
import { AppError } from "../middleware/error.middleware";
import { wsService } from "./websocket.service";
import { logAuditEvent } from "./audit.service";

export async function createHospitalRequest(params: {
  emergencyCaseId: string;
  hospitalId: string;
  requestedResources?: Array<{ type: string; quantity: number }>;
  actorId?: string;
  correlationId?: string;
}) {
  const emergency = await db.orm.public.EmergencyCase.where({
    emergencyCaseId: params.emergencyCaseId,
  }).first();

  if (!emergency) {
    throw new AppError(404, "EMERGENCY_NOT_FOUND", "Emergency case not found");
  }

  const hospital = await db.orm.public.Hospital.where({
    hospitalId: params.hospitalId,
  }).first();

  if (!hospital) {
    throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital not found");
  }

  // Cancel any prior pending requests for this emergency
  const pendingRequests = await db.orm.public.HospitalRequest.where({
    emergencyCaseId: params.emergencyCaseId,
    status: "PENDING",
  }).all();

  for (const pr of pendingRequests) {
    await db.orm.public.HospitalRequest.where({
      hospitalRequestId: pr.hospitalRequestId,
    }).update({
      status: "CANCELLED",
      rejectionReason: "Superceded by new hospital request",
    });
  }

  const resourcesString = params.requestedResources
    ? JSON.stringify(params.requestedResources)
    : emergency.requiredResources || "[]";

  const request = await db.orm.public.HospitalRequest.create({
    emergencyCaseId: params.emergencyCaseId,
    hospitalId: params.hospitalId,
    requestedResources: resourcesString,
    status: "PENDING",
  });

  // Advance emergency case state to HOSPITAL_REQUESTED
  await db.orm.public.EmergencyCase.where({
    emergencyCaseId: params.emergencyCaseId,
  }).update({
    state: "HOSPITAL_REQUESTED",
  });

  await logAuditEvent({
    emergencyCaseId: params.emergencyCaseId,
    eventType: "HOSPITAL_REQUEST_CREATED",
    actorType: "SYSTEM",
    actorId: params.actorId || "dispatcher",
    details: {
      hospitalId: params.hospitalId,
      requestId: request.hospitalRequestId,
      resources: resourcesString,
    },
  });

  wsService.emitEvent({
    eventType: "HOSPITAL_REQUEST_CREATED",
    entityType: "hospital_request",
    entityId: request.hospitalRequestId,
    hospitalId: params.hospitalId,
    emergencyId: params.emergencyCaseId,
    correlationId: params.correlationId,
    payload: {
      requestId: request.hospitalRequestId,
      emergencyId: params.emergencyCaseId,
      hospitalId: params.hospitalId,
      status: "PENDING",
      requestedResources: JSON.parse(resourcesString),
      createdAt: request.createdAt,
    },
  });

  return request;
}

export async function acceptHospitalRequest(
  requestId: string,
  actorId = "hospital_er_staff",
  correlationId?: string
) {
  const request = await db.orm.public.HospitalRequest.where({
    hospitalRequestId: requestId,
  }).first();

  if (!request) {
    throw new AppError(404, "REQUEST_NOT_FOUND", "Hospital request not found");
  }

  if (request.status !== "PENDING") {
    throw new AppError(
      409,
      "INVALID_REQUEST_STATE",
      `Cannot accept request in status ${request.status}`
    );
  }

  const emergency = await db.orm.public.EmergencyCase.where({
    emergencyCaseId: request.emergencyCaseId,
  }).first();

  if (!emergency) {
    throw new AppError(404, "EMERGENCY_NOT_FOUND", "Emergency case not found");
  }

  // Parse resources to reserve
  let resourcesToReserve: Array<{ type: string; quantity: number }> = [];
  try {
    if (request.requestedResources) {
      resourcesToReserve = JSON.parse(request.requestedResources);
    }
  } catch {
    resourcesToReserve = [];
  }

  // Deduct available, increment reserved in HospitalResource
  for (const item of resourcesToReserve) {
    const res = await db.orm.public.HospitalResource.where({
      hospitalId: request.hospitalId,
      resourceType: item.type,
    }).first();

    if (res && res.available >= item.quantity) {
      await db.orm.public.HospitalResource.where({
        resourceId: res.resourceId,
      }).update({
        available: Math.max(0, res.available - item.quantity),
        reserved: res.reserved + item.quantity,
      });
    }
  }

  // Create Reservation
  const reservationExpiry = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  const reservation = await db.orm.public.Reservation.create({
    emergencyCaseId: request.emergencyCaseId,
    hospitalId: request.hospitalId,
    hospitalRequestId: request.hospitalRequestId,
    status: "ACTIVE",
    reservedResources: request.requestedResources,
    expiresAt: reservationExpiry,
  });

  // Update request to ACCEPTED
  const updatedRequest = await db.orm.public.HospitalRequest.where({
    hospitalRequestId: requestId,
  }).update({
    status: "ACCEPTED",
    respondedAt: new Date().toISOString(),
  });

  if (!updatedRequest) {
    throw new AppError(500, "UPDATE_FAILED", "Failed to update hospital request");
  }

  // Update emergency case state to HOSPITAL_ACCEPTED and set destination
  await db.orm.public.EmergencyCase.where({
    emergencyCaseId: request.emergencyCaseId,
  }).update({
    state: "HOSPITAL_ACCEPTED",
    destinationHospitalId: request.hospitalId,
  });

  await logAuditEvent({
    emergencyCaseId: request.emergencyCaseId,
    eventType: "HOSPITAL_REQUEST_ACCEPTED",
    actorType: "HOSPITAL_ER",
    actorId,
    details: {
      requestId,
      reservationId: reservation.reservationId,
      hospitalId: request.hospitalId,
    },
  });

  // Emit WebSocket events
  wsService.emitEvent({
    eventType: "HOSPITAL_REQUEST_ACCEPTED",
    entityType: "hospital_request",
    entityId: requestId,
    hospitalId: request.hospitalId,
    emergencyId: request.emergencyCaseId,
    correlationId,
    payload: {
      requestId,
      emergencyId: request.emergencyCaseId,
      hospitalId: request.hospitalId,
      reservationId: reservation.reservationId,
      status: "ACCEPTED",
    },
  });

  wsService.emitEvent({
    eventType: "HOSPITAL_DESTINATION_CHANGED",
    entityType: "emergency_case",
    entityId: request.emergencyCaseId,
    hospitalId: request.hospitalId,
    emergencyId: request.emergencyCaseId,
    correlationId,
    payload: {
      emergencyId: request.emergencyCaseId,
      destinationHospitalId: request.hospitalId,
      state: "HOSPITAL_ACCEPTED",
    },
  });

  return {
    request: updatedRequest,
    reservation,
  };
}

export async function rejectHospitalRequest(
  requestId: string,
  reason: string,
  actorId = "hospital_er_staff",
  correlationId?: string
) {
  const request = await db.orm.public.HospitalRequest.where({
    hospitalRequestId: requestId,
  }).first();

  if (!request) {
    throw new AppError(404, "REQUEST_NOT_FOUND", "Hospital request not found");
  }

  if (request.status !== "PENDING") {
    throw new AppError(
      409,
      "INVALID_REQUEST_STATE",
      `Cannot reject request in status ${request.status}`
    );
  }

  const updatedRequest = await db.orm.public.HospitalRequest.where({
    hospitalRequestId: requestId,
  }).update({
    status: "REJECTED",
    rejectionReason: reason || "Hospital capacity unavailable",
    respondedAt: new Date().toISOString(),
  });

  if (!updatedRequest) {
    throw new AppError(500, "UPDATE_FAILED", "Failed to update hospital request");
  }

  // Emergency reverts to SEARCHING_HOSPITAL to trigger dynamic fallback
  await db.orm.public.EmergencyCase.where({
    emergencyCaseId: request.emergencyCaseId,
  }).update({
    state: "SEARCHING_HOSPITAL",
  });

  await logAuditEvent({
    emergencyCaseId: request.emergencyCaseId,
    eventType: "HOSPITAL_REQUEST_REJECTED",
    actorType: "HOSPITAL_ER",
    actorId,
    details: {
      requestId,
      reason,
    },
  });

  wsService.emitEvent({
    eventType: "HOSPITAL_REQUEST_REJECTED",
    entityType: "hospital_request",
    entityId: requestId,
    hospitalId: request.hospitalId,
    emergencyId: request.emergencyCaseId,
    correlationId,
    payload: {
      requestId,
      emergencyId: request.emergencyCaseId,
      hospitalId: request.hospitalId,
      reason,
      status: "REJECTED",
    },
  });

  return updatedRequest;
}

// Timeout handler for expired requests
export async function expireStaleHospitalRequests(timeoutMinutes = 3) {
  const pending = await db.orm.public.HospitalRequest.where({
    status: "PENDING",
  }).all();

  const now = Date.now();
  const expired = [];

  for (const req of pending) {
    const requestedTime = new Date(req.requestedAt).getTime();
    if (now - requestedTime > timeoutMinutes * 60 * 1000) {
      const updated = await db.orm.public.HospitalRequest.where({
        hospitalRequestId: req.hospitalRequestId,
      }).update({
        status: "EXPIRED",
        rejectionReason: "Request timed out awaiting hospital acceptance",
        respondedAt: new Date().toISOString(),
      });

      await db.orm.public.EmergencyCase.where({
        emergencyCaseId: req.emergencyCaseId,
      }).update({
        state: "SEARCHING_HOSPITAL",
      });

      await logAuditEvent({
        emergencyCaseId: req.emergencyCaseId,
        eventType: "HOSPITAL_REQUEST_EXPIRED",
        actorType: "SYSTEM",
        actorId: "handshake_timeout_monitor",
        details: { requestId: req.hospitalRequestId },
      });

      wsService.emitEvent({
        eventType: "ALERT_CREATED",
        entityType: "hospital_request",
        entityId: req.hospitalRequestId,
        emergencyId: req.emergencyCaseId,
        payload: {
          alertType: "REQUEST_TIMEOUT",
          requestId: req.hospitalRequestId,
          emergencyId: req.emergencyCaseId,
          message: "Hospital request expired due to response timeout",
        },
      });

      expired.push(updated);
    }
  }

  return expired;
}
