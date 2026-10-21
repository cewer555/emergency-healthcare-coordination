import { db } from "../prisma/db";
import { AppError } from "../middleware/error.middleware";
import { wsService } from "./websocket.service";
import { logAuditEvent } from "./audit.service";
import { evaluateResourceRequirements } from "./ai.service";
import type { EmergencyState } from "../types";

export interface CreateEmergencyInput {
  patient_id?: string;
  patientId?: string;
  ambulance_id?: string;
  ambulanceId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  origin?: { lat: number; lon: number; latitude?: number; longitude?: number };
  chief_complaint?: string;
  chiefComplaint?: string;
  requirements?: string[] | Array<{ type: string; quantity: number }>;
  requiredResources?: string;
}

const ALLOWED_TRANSITIONS: Record<EmergencyState, EmergencyState[]> = {
  CREATED: ["ASSESSING", "SEARCHING_HOSPITAL", "CANCELLED"],
  ASSESSING: ["SEARCHING_HOSPITAL", "CANCELLED"],
  SEARCHING_HOSPITAL: ["HOSPITAL_REQUESTED", "CANCELLED"],
  HOSPITAL_REQUESTED: ["HOSPITAL_ACCEPTED", "SEARCHING_HOSPITAL", "CANCELLED"],
  HOSPITAL_ACCEPTED: ["EN_ROUTE", "SEARCHING_HOSPITAL", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "SEARCHING_HOSPITAL", "CANCELLED"],
  ARRIVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function createEmergency(
  input: CreateEmergencyInput,
  correlationId?: string
) {
  const patientId = input.patientId || input.patient_id;
  if (!patientId) {
    throw new AppError(400, "VALIDATION_ERROR", "patient_id is required");
  }

  const patient = await db.orm.public.Patient.where({ patientId }).first();
  if (!patient) {
    throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found");
  }

  const ambulanceId = input.ambulanceId || input.ambulance_id || null;
  const priority = input.priority || "HIGH";
  const chiefComplaint = input.chiefComplaint || input.chief_complaint || null;

  const lat = input.origin?.lat ?? input.origin?.latitude ?? null;
  const lon = input.origin?.lon ?? input.origin?.longitude ?? null;

  let requiredResourcesStr: string;

  if (input.requirements && input.requirements.length > 0) {
    if (typeof input.requirements[0] === "string") {
      requiredResourcesStr = JSON.stringify(
        (input.requirements as string[]).map((r) => ({ type: r, quantity: 1 }))
      );
    } else {
      requiredResourcesStr = JSON.stringify(input.requirements);
    }
  } else {
    // Automatically invoke AI Patient Resource Requirement Engine
    const aiInference = await evaluateResourceRequirements({
      chiefComplaint: chiefComplaint ?? undefined,
    });
    requiredResourcesStr = JSON.stringify(aiInference.requirements);
  }

  const emergency = await db.orm.public.EmergencyCase.create({
    patientId,
    ambulanceId,
    priority,
    state: "ASSESSING",
    chiefComplaint,
    requiredResources: requiredResourcesStr,
    currentLatitude: lat,
    currentLongitude: lon,
    destinationHospitalId: null,
  });

  await logAuditEvent({
    emergencyCaseId: emergency.emergencyCaseId,
    eventType: "EMERGENCY_CREATED",
    actorType: "DISPATCHER",
    actorId: "dispatch_system",
    details: {
      patientId,
      ambulanceId,
      priority,
      chiefComplaint,
      requiredResources: requiredResourcesStr,
    },
  });

  // Real-time broadcast
  wsService.emitEvent({
    eventType: "EMERGENCY_CREATED",
    entityType: "emergency_case",
    entityId: emergency.emergencyCaseId,
    emergencyId: emergency.emergencyCaseId,
    correlationId,
    payload: {
      emergency_id: emergency.emergencyCaseId,
      patient_id: patientId,
      ambulance_id: ambulanceId,
      priority,
      status: emergency.state,
      created_at: emergency.createdAt,
    },
  });

  return {
    emergency_id: emergency.emergencyCaseId,
    emergencyCaseId: emergency.emergencyCaseId,
    status: emergency.state,
    state: emergency.state,
    priority: emergency.priority,
    patient_id: emergency.patientId,
    ambulance_id: emergency.ambulanceId,
    created_at: emergency.createdAt,
    version: 1,
  };
}

export async function getAllEmergencies(filter?: {
  status?: string;
  state?: string;
  priority?: string;
}) {
  const cases = await db.orm.public.EmergencyCase.where({}).all();

  return cases.filter((c) => {
    const targetStatus = filter?.status || filter?.state;
    if (targetStatus && c.state.toUpperCase() !== targetStatus.toUpperCase()) {
      return false;
    }
    if (filter?.priority && c.priority.toUpperCase() !== filter.priority.toUpperCase()) {
      return false;
    }
    return true;
  });
}

export async function getEmergencyById(emergencyId: string) {
  const emergency = await db.orm.public.EmergencyCase.where({
    emergencyCaseId: emergencyId,
  }).first();

  if (!emergency) return null;

  const [patient, ambulance, destinationHospital, requests, reservations, auditEvents] =
    await Promise.all([
      db.orm.public.Patient.where({ patientId: emergency.patientId }).first(),
      emergency.ambulanceId
        ? db.orm.public.Ambulance.where({ ambulanceId: emergency.ambulanceId }).first()
        : null,
      emergency.destinationHospitalId
        ? db.orm.public.Hospital.where({
            hospitalId: emergency.destinationHospitalId,
          }).first()
        : null,
      db.orm.public.HospitalRequest.where({
        emergencyCaseId: emergency.emergencyCaseId,
      }).all(),
      db.orm.public.Reservation.where({
        emergencyCaseId: emergency.emergencyCaseId,
      }).all(),
      db.orm.public.AuditEvent.where({
        emergencyCaseId: emergency.emergencyCaseId,
      }).all(),
    ]);

  return {
    ...emergency,
    emergency_id: emergency.emergencyCaseId,
    status: emergency.state,
    patient,
    ambulance,
    destinationHospital,
    requests,
    reservations,
    auditEvents,
  };
}

export async function updateEmergency(
  emergencyId: string,
  updates: {
    state?: EmergencyState;
    status?: EmergencyState;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    ambulanceId?: string | null;
    destinationHospitalId?: string | null;
    riskLevel?: string;
    cancellationReason?: string;
  },
  actor?: { id: string; role: string },
  correlationId?: string
) {
  const existing = await db.orm.public.EmergencyCase.where({
    emergencyCaseId: emergencyId,
  }).first();

  if (!existing) {
    throw new AppError(404, "EMERGENCY_NOT_FOUND", "Emergency case not found");
  }

  const nextState = (updates.state || updates.status) as EmergencyState | undefined;

  // Validate state machine transition if state is changing
  if (nextState && nextState !== existing.state) {
    const currentState = existing.state as EmergencyState;
    const allowed = ALLOWED_TRANSITIONS[currentState] || [];

    if (!allowed.includes(nextState)) {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        `Cannot transition emergency from ${currentState} to ${nextState}. Allowed transitions: ${allowed.join(", ")}`
      );
    }

    // State-specific actions
    if (nextState === "ARRIVED") {
      // Consume reservations
      const activeReservations = await db.orm.public.Reservation.where({
        emergencyCaseId: emergencyId,
        status: "ACTIVE",
      }).all();

      for (const res of activeReservations) {
        await db.orm.public.Reservation.where({
          reservationId: res.reservationId,
        }).update({
          status: "CONSUMED",
        });
      }
    }
  }

  const updated = await db.orm.public.EmergencyCase.where({
    emergencyCaseId: emergencyId,
  }).update({
    ...(nextState ? { state: nextState } : {}),
    ...(updates.priority ? { priority: updates.priority } : {}),
    ...(updates.ambulanceId !== undefined ? { ambulanceId: updates.ambulanceId } : {}),
    ...(updates.destinationHospitalId !== undefined
      ? { destinationHospitalId: updates.destinationHospitalId }
      : {}),
    ...(updates.riskLevel ? { riskLevel: updates.riskLevel } : {}),
  });

  await logAuditEvent({
    emergencyCaseId: emergencyId,
    eventType: "EMERGENCY_STATUS_UPDATED",
    actorType: actor?.role || "SYSTEM",
    actorId: actor?.id || "dispatcher",
    details: {
      fromState: existing.state,
      toState: nextState || existing.state,
      updates,
    },
  });

  wsService.emitEvent({
    eventType: "EMERGENCY_STATUS_UPDATED",
    entityType: "emergency_case",
    entityId: emergencyId,
    emergencyId,
    hospitalId: updated?.destinationHospitalId ?? undefined,
    correlationId,
    payload: {
      emergency_id: emergencyId,
      status: updated?.state,
      priority: updated?.priority,
      destinationHospitalId: updated?.destinationHospitalId,
      updated_at: updated?.updatedAt,
    },
  });

  return {
    ...updated,
    emergency_id: updated?.emergencyCaseId,
    status: updated?.state,
  };
}

export async function getEmergencyHospitalRequests(emergencyId: string) {
  const emergency = await db.orm.public.EmergencyCase.where({
    emergencyCaseId: emergencyId,
  }).first();

  if (!emergency) {
    throw new AppError(404, "EMERGENCY_NOT_FOUND", "Emergency case not found");
  }

  return db.orm.public.HospitalRequest.where({
    emergencyCaseId: emergencyId,
  }).all();
}
