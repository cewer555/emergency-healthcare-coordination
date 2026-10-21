import { db } from "../prisma/db";
import { AppError } from "../middleware/error.middleware";
import { wsService } from "./websocket.service";
import { appendVitalReading } from "./patient.service";

export interface CreateAmbulanceInput {
  registrationNo: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  crewDetails?: string | null;
  equipmentSummary?: string | null;
}

export interface OfflineSyncOperation {
  clientOperationId: string;
  type: "LOCATION_UPDATE" | "VITAL_READING" | "STATUS_UPDATE";
  ambulanceId: string;
  payload: Record<string, any>;
  createdAt: string;
}

const acknowledgedOperations = new Set<string>();

export async function createAmbulance(data: CreateAmbulanceInput) {
  return db.orm.public.Ambulance.create({
    registrationNo: data.registrationNo,
    status: data.status,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    crewDetails: data.crewDetails ?? null,
    equipmentSummary: data.equipmentSummary ?? null,
  });
}

export async function getAllAmbulances() {
  return db.orm.public.Ambulance.where({}).all();
}

export async function getAmbulanceById(ambulanceId: string) {
  return db.orm.public.Ambulance.where({ ambulanceId }).first();
}

export async function updateAmbulanceLocation(
  ambulanceId: string,
  location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  },
  correlationId?: string
) {
  const ambulance = await db.orm.public.Ambulance.where({ ambulanceId }).first();
  if (!ambulance) {
    throw new AppError(404, "AMBULANCE_NOT_FOUND", "Ambulance not found");
  }

  if (
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new AppError(400, "INVALID_COORDINATES", "Coordinates out of bounds");
  }

  const updated = await db.orm.public.Ambulance.where({ ambulanceId }).update({
    latitude: location.latitude,
    longitude: location.longitude,
  });

  // Check if assigned to an active emergency
  const activeCase = await db.orm.public.EmergencyCase.where({
    ambulanceId,
  }).first();

  if (activeCase) {
    // Also update case current coordinates
    await db.orm.public.EmergencyCase.where({
      emergencyCaseId: activeCase.emergencyCaseId,
    }).update({
      currentLatitude: location.latitude,
      currentLongitude: location.longitude,
    });
  }

  // Emit real-time WebSocket event
  wsService.emitEvent({
    eventType: "AMBULANCE_LOCATION_UPDATED",
    entityType: "ambulance",
    entityId: ambulanceId,
    correlationId,
    emergencyId: activeCase?.emergencyCaseId,
    hospitalId: activeCase?.destinationHospitalId ?? undefined,
    payload: {
      ambulanceId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      emergencyId: activeCase?.emergencyCaseId,
      updatedAt: new Date().toISOString(),
    },
  });

  return updated;
}

export async function updateAmbulanceStatus(
  ambulanceId: string,
  status: string,
  correlationId?: string
) {
  const ambulance = await db.orm.public.Ambulance.where({ ambulanceId }).first();
  if (!ambulance) {
    throw new AppError(404, "AMBULANCE_NOT_FOUND", "Ambulance not found");
  }

  const updated = await db.orm.public.Ambulance.where({ ambulanceId }).update({
    status,
  });

  wsService.emitEvent({
    eventType: "AMBULANCE_STATUS_UPDATED",
    entityType: "ambulance",
    entityId: ambulanceId,
    correlationId,
    payload: {
      ambulanceId,
      status,
      updatedAt: new Date().toISOString(),
    },
  });

  return updated;
}

// 14. Offline Ambulance Behavior: Queue synchronization
export async function syncOfflineQueue(operations: OfflineSyncOperation[]) {
  const results: Array<{
    clientOperationId: string;
    status: "PROCESSED" | "DUPLICATE" | "FAILED";
    error?: string;
  }> = [];

  // Sort chronologically
  const sorted = [...operations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const op of sorted) {
    if (acknowledgedOperations.has(op.clientOperationId)) {
      results.push({
        clientOperationId: op.clientOperationId,
        status: "DUPLICATE",
      });
      continue;
    }

    try {
      if (op.type === "LOCATION_UPDATE") {
        await updateAmbulanceLocation(op.ambulanceId, {
          latitude: op.payload.latitude,
          longitude: op.payload.longitude,
          heading: op.payload.heading,
          speed: op.payload.speed,
        });
      } else if (op.type === "STATUS_UPDATE") {
        await updateAmbulanceStatus(op.ambulanceId, op.payload.status);
      } else if (op.type === "VITAL_READING") {
        const patientId = op.payload.patientId;
        if (patientId) {
          await appendVitalReading(patientId, op.payload.vitals);
        }
      }

      acknowledgedOperations.add(op.clientOperationId);
      results.push({
        clientOperationId: op.clientOperationId,
        status: "PROCESSED",
      });
    } catch (err: any) {
      results.push({
        clientOperationId: op.clientOperationId,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  return {
    synchronized_count: results.filter((r) => r.status === "PROCESSED").length,
    duplicate_count: results.filter((r) => r.status === "DUPLICATE").length,
    failed_count: results.filter((r) => r.status === "FAILED").length,
    results,
  };
}
