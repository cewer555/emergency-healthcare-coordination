import { db } from "../prisma/db";
import { calculateFreshness } from "./hospital.service";
import type { CandidateExplanation } from "../types";

export interface MatchingRequirements {
  originLat: number;
  originLon: number;
  requiredResources: Array<{ type: string; quantity: number }>;
  requiredCapabilities?: string[];
  excludedHospitalIds?: string[];
  maxEtaMinutes?: number;
}

// Haversine formula to compute distance in km
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Estimate ETA in minutes with traffic factor
export function estimateEtaMinutes(
  distanceKm: number,
  averageSpeedKmH = 40
): number {
  const baseMinutes = (distanceKm / averageSpeedKmH) * 60;
  // Add 20% traffic buffer + 2 min dispatch overhead
  const eta = Math.ceil(baseMinutes * 1.2 + 2);
  return Math.max(3, eta);
}

export async function findCandidateHospitals(
  requirements: MatchingRequirements
): Promise<CandidateExplanation[]> {
  const hospitals = await db.orm.public.Hospital.where({}).all();
  const allResources = await db.orm.public.HospitalResource.where({}).all();
  const allCapabilities = await db.orm.public.HospitalCapability.where({}).all();

  const candidates: CandidateExplanation[] = [];

  for (const h of hospitals) {
    if (requirements.excludedHospitalIds?.includes(h.hospitalId)) {
      continue;
    }

    const reasons: string[] = [];
    let eligible = true;

    // Filter 1: Hospital is operational
    const isOperational =
      h.status.toUpperCase() === "OPERATIONAL" ||
      h.status.toUpperCase() === "ACTIVE";

    if (!isOperational) {
      eligible = false;
      reasons.push("HOSPITAL_NOT_OPERATIONAL");
    }

    // Distance & ETA
    const distanceKm = calculateHaversineDistanceKm(
      requirements.originLat,
      requirements.originLon,
      h.latitude,
      h.longitude
    );
    const etaMinutes = estimateEtaMinutes(distanceKm);

    if (requirements.maxEtaMinutes && etaMinutes > requirements.maxEtaMinutes) {
      eligible = false;
      reasons.push("EXCEEDS_MAX_ETA");
    }

    // Filter 2: Capabilities check
    const hospitalCaps = allCapabilities.filter(
      (c) => c.hospitalId === h.hospitalId && c.enabled
    );
    const capTypes = new Set(hospitalCaps.map((c) => c.capabilityType.toUpperCase()));

    let capabilityMatch = 1.0;
    if (requirements.requiredCapabilities && requirements.requiredCapabilities.length > 0) {
      const matched = requirements.requiredCapabilities.filter((c) =>
        capTypes.has(c.toUpperCase())
      );
      capabilityMatch = matched.length / requirements.requiredCapabilities.length;
      if (capabilityMatch < 1.0) {
        eligible = false;
        reasons.push("MISSING_REQUIRED_CAPABILITY");
      } else {
        reasons.push("CAPABILITY_MATCH");
      }
    }

    // Filter 3: Resource check
    const hospitalRes = allResources.filter((r) => r.hospitalId === h.hospitalId);
    const resMap = new Map(hospitalRes.map((r) => [r.resourceType.toUpperCase(), r]));

    const resourceExplanations: Array<{
      type: string;
      required: number;
      available: number;
    }> = [];

    let freshestTimestamp = 0;
    let capacityConfidence = 0.95;

    for (const reqRes of requirements.requiredResources) {
      const typeKey = reqRes.type.toUpperCase();
      const actualRes = resMap.get(typeKey);
      const availableCount = actualRes ? actualRes.available : 0;

      resourceExplanations.push({
        type: reqRes.type,
        required: reqRes.quantity,
        available: availableCount,
      });

      if (actualRes) {
        const lastUpdated = actualRes.lastUpdated
          ? new Date(actualRes.lastUpdated).getTime()
          : new Date(actualRes.createdAt).getTime();
        if (lastUpdated > freshestTimestamp) freshestTimestamp = lastUpdated;
      }

      if (availableCount < reqRes.quantity) {
        eligible = false;
        reasons.push(`INSUFFICIENT_${typeKey}`);
      } else {
        reasons.push(`${typeKey}_AVAILABLE`);
      }
    }

    // Filter 4: Data Freshness
    const { freshness_seconds, freshness_status } = calculateFreshness(
      freshestTimestamp > 0 ? new Date(freshestTimestamp) : new Date(h.createdAt)
    );

    if (freshness_status === "STALE") {
      capacityConfidence = 0.5;
      reasons.push("DATA_STALE_UNCERTAIN");
    } else if (freshness_status === "AGING") {
      capacityConfidence = 0.75;
      reasons.push("DATA_AGING");
    }

    if (etaMinutes <= 15) {
      reasons.push("LOW_ETA");
    }

    candidates.push({
      hospital_id: h.hospitalId,
      name: h.name,
      code: h.code,
      eligible,
      eta_minutes: etaMinutes,
      distance_km: distanceKm,
      required_resources: resourceExplanations,
      capability_match: capabilityMatch,
      capacity_confidence: capacityConfidence,
      freshness_seconds,
      freshness_status,
      reason_codes: reasons,
    });
  }

  // Ranking: Eligible first, then lowest ETA, then higher available capacity
  candidates.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    // Both eligible: compare ETA
    if (a.eta_minutes !== b.eta_minutes) return a.eta_minutes - b.eta_minutes;
    // Tie break on distance
    return a.distance_km - b.distance_km;
  });

  return candidates;
}
