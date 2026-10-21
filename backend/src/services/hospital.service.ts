import { db } from "../prisma/db";
import { AppError } from "../middleware/error.middleware";
import { wsService } from "./websocket.service";
import type { ResourceFreshnessStatus } from "../types";

export interface ResourceInput {
  resourceType: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
}

export interface CapabilityInput {
  capabilityType: string;
  enabled: boolean;
}

// Calculate resource freshness status
export function calculateFreshness(lastUpdatedDate: Date): {
  freshness_seconds: number;
  freshness_status: ResourceFreshnessStatus;
} {
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - lastUpdatedDate.getTime()) / 1000));

  let status: ResourceFreshnessStatus = "FRESH";
  if (diffSeconds > 3600) {
    status = "STALE";
  } else if (diffSeconds > 900) {
    status = "AGING";
  }

  return {
    freshness_seconds: diffSeconds,
    freshness_status: status,
  };
}

// Get all hospitals
export async function getAllHospitals(filter?: { status?: string }) {
  if (filter?.status) {
    return db.orm.public.Hospital.where({ status: filter.status }).all();
  }
  return db.orm.public.Hospital.where({}).all();
}

// Get a hospital by ID with its resources and capabilities
export async function getHospitalById(hospitalId: string) {
  const hospital = await db.orm.public.Hospital.where({ hospitalId }).first();
  if (!hospital) return null;

  const [resources, capabilities] = await Promise.all([
    db.orm.public.HospitalResource.where({ hospitalId }).all(),
    db.orm.public.HospitalCapability.where({ hospitalId }).all(),
  ]);

  return {
    ...hospital,
    resources,
    capabilities,
  };
}

// Register a hospital
export async function createHospital(data: {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  status: string;
  emergencyContact?: string | null;
  timezone: string;
}) {
  return db.orm.public.Hospital.create({
    name: data.name,
    code: data.code,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address ?? null,
    status: data.status,
    emergencyContact: data.emergencyContact ?? null,
    timezone: data.timezone,
  });
}

// Get current hospital resources with freshness computation
export async function getHospitalResources(hospitalId: string) {
  const hospital = await db.orm.public.Hospital.where({ hospitalId }).first();
  if (!hospital) {
    throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital not found");
  }

  const resources = await db.orm.public.HospitalResource.where({ hospitalId }).all();

  return resources.map((r) => {
    const updated = r.lastUpdated ? new Date(r.lastUpdated) : new Date(r.createdAt);
    const { freshness_seconds, freshness_status } = calculateFreshness(updated);

    return {
      ...r,
      freshness_seconds,
      freshness_status,
    };
  });
}

// Bulk update hospital resources with strict invariant validation:
// available + occupied + reserved + maintenance = total
export async function updateHospitalResources(
  hospitalId: string,
  resources: ResourceInput[],
  correlationId?: string
) {
  const hospital = await db.orm.public.Hospital.where({ hospitalId }).first();
  if (!hospital) {
    throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital not found");
  }

  // Validate math invariant for each resource
  for (const item of resources) {
    const computedTotal =
      item.available + item.occupied + item.reserved + item.maintenance;

    if (computedTotal !== item.total) {
      throw new AppError(
        422,
        "RESOURCE_INVARIANT_VIOLATION",
        `Resource arithmetic inconsistency for ${item.resourceType}: available (${item.available}) + occupied (${item.occupied}) + reserved (${item.reserved}) + maintenance (${item.maintenance}) = ${computedTotal}, but total is ${item.total}`,
        { resourceType: item.resourceType, total: item.total, computedTotal }
      );
    }
  }

  const updatedRecords = [];

  for (const item of resources) {
    const existing = await db.orm.public.HospitalResource.where({
      hospitalId,
      resourceType: item.resourceType,
    }).first();

    if (existing) {
      const updated = await db.orm.public.HospitalResource.where({
        resourceId: existing.resourceId,
      }).update({
        total: item.total,
        available: item.available,
        occupied: item.occupied,
        reserved: item.reserved,
        maintenance: item.maintenance,
      });
      updatedRecords.push(updated);
    } else {
      const created = await db.orm.public.HospitalResource.create({
        hospitalId,
        resourceType: item.resourceType,
        total: item.total,
        available: item.available,
        occupied: item.occupied,
        reserved: item.reserved,
        maintenance: item.maintenance,
      });
      updatedRecords.push(created);
    }
  }

  // Emit real-time event
  wsService.emitEvent({
    eventType: "HOSPITAL_RESOURCES_UPDATED",
    entityType: "hospital_resource",
    entityId: hospitalId,
    hospitalId,
    correlationId,
    payload: {
      hospitalId,
      resources: updatedRecords,
      updatedAt: new Date().toISOString(),
    },
  });

  return updatedRecords;
}

// Get hospital capabilities
export async function getHospitalCapabilities(hospitalId: string) {
  const hospital = await db.orm.public.Hospital.where({ hospitalId }).first();
  if (!hospital) {
    throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital not found");
  }

  return db.orm.public.HospitalCapability.where({ hospitalId }).all();
}

// Update or add hospital capabilities
export async function updateHospitalCapabilities(
  hospitalId: string,
  capabilities: CapabilityInput[]
) {
  const hospital = await db.orm.public.Hospital.where({ hospitalId }).first();
  if (!hospital) {
    throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital not found");
  }

  const results = [];

  for (const cap of capabilities) {
    const existing = await db.orm.public.HospitalCapability.where({
      hospitalId,
      capabilityType: cap.capabilityType,
    }).first();

    if (existing) {
      const updated = await db.orm.public.HospitalCapability.where({
        capabilityId: existing.capabilityId,
      }).update({
        enabled: cap.enabled,
      });
      results.push(updated);
    } else {
      const created = await db.orm.public.HospitalCapability.create({
        hospitalId,
        capabilityType: cap.capabilityType,
        enabled: cap.enabled,
      });
      results.push(created);
    }
  }

  return results;
}