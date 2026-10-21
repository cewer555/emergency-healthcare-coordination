import { db } from "../prisma/db";
import { findCandidateHospitals } from "./matching.service";
import { createHospitalRequest } from "./handshake.service";
import { logAuditEvent } from "./audit.service";
import { wsService } from "./websocket.service";

interface RerouteState {
  lastReroutedAt: number;
  previousDestinationId?: string;
}

const rerouteDebounceMap = new Map<string, RerouteState>();
const REROUTE_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown to avoid oscillation

export async function evaluateDynamicReroute(
  emergencyCaseId: string,
  triggerReason: string,
  correlationId?: string
) {
  const emergency = await db.orm.public.EmergencyCase.where({
    emergencyCaseId,
  }).first();

  if (!emergency) return null;

  // Only re-evaluate if en route or searching/requested
  if (
    emergency.state !== "EN_ROUTE" &&
    emergency.state !== "HOSPITAL_ACCEPTED" &&
    emergency.state !== "SEARCHING_HOSPITAL"
  ) {
    return null;
  }

  // Check cooldown to avoid oscillation
  const now = Date.now();
  const debounceInfo = rerouteDebounceMap.get(emergencyCaseId);
  if (debounceInfo && now - debounceInfo.lastReroutedAt < REROUTE_COOLDOWN_MS) {
    console.log(
      `[REROUTING] Cooldown active for emergency ${emergencyCaseId}, skipping oscilliating switch.`
    );
    return null;
  }

  // Parse required resources
  let requiredResources: Array<{ type: string; quantity: number }> = [];
  try {
    if (emergency.requiredResources) {
      requiredResources = JSON.parse(emergency.requiredResources);
    }
  } catch {
    requiredResources = [{ type: "EMERGENCY_BED", quantity: 1 }];
  }

  const currentLat = emergency.currentLatitude ?? 13.08;
  const currentLon = emergency.currentLongitude ?? 80.27;

  // Run matching engine excluding current destination if it failed
  const candidates = await findCandidateHospitals({
    originLat: currentLat,
    originLon: currentLon,
    requiredResources,
    excludedHospitalIds: emergency.destinationHospitalId
      ? [emergency.destinationHospitalId]
      : [],
  });

  const bestCandidate = candidates.find((c) => c.eligible);
  if (!bestCandidate) {
    wsService.emitEvent({
      eventType: "ALERT_CREATED",
      entityType: "emergency_case",
      entityId: emergencyCaseId,
      emergencyId: emergencyCaseId,
      correlationId,
      payload: {
        alertType: "NO_ELIGIBLE_HOSPITAL_FOR_REROUTE",
        emergencyId: emergencyCaseId,
        triggerReason,
        message: "No alternative eligible hospital available under current routing constraints.",
      },
    });
    return null;
  }

  // Update debounce
  rerouteDebounceMap.set(emergencyCaseId, {
    lastReroutedAt: now,
    previousDestinationId: emergency.destinationHospitalId ?? undefined,
  });

  await logAuditEvent({
    emergencyCaseId,
    eventType: "DYNAMIC_REROUTE_TRIGGERED",
    actorType: "SYSTEM",
    actorId: "dynamic_rerouting_engine",
    details: {
      triggerReason,
      previousDestination: emergency.destinationHospitalId,
      newDestinationCandidate: bestCandidate.hospital_id,
      candidateEta: bestCandidate.eta_minutes,
      reasonCodes: bestCandidate.reason_codes,
    },
  });

  // Initiate handshake with new candidate
  const newRequest = await createHospitalRequest({
    emergencyCaseId,
    hospitalId: bestCandidate.hospital_id,
    requestedResources: requiredResources,
    actorId: "dynamic_rerouting_engine",
    correlationId,
  });

  return {
    rerouted: true,
    triggerReason,
    previousDestinationId: emergency.destinationHospitalId,
    newCandidate: bestCandidate,
    newRequest,
  };
}
