import { db } from "../prisma/db";

export interface LogAuditParams {
  emergencyCaseId?: string | null;
  eventType: string;
  actorType?: string | null;
  actorId?: string | null;
  details?: Record<string, unknown> | string | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    const detailsString =
      params.details && typeof params.details === "object"
        ? JSON.stringify(params.details)
        : (params.details as string | null) ?? null;

    return await db.orm.public.AuditEvent.create({
      emergencyCaseId: params.emergencyCaseId ?? null,
      eventType: params.eventType,
      actorType: params.actorType ?? null,
      actorId: params.actorId ?? null,
      details: detailsString,
    });
  } catch (error) {
    console.error("Failed to persist audit event:", error);
    return null;
  }
}

export async function getAuditTrailForEmergency(emergencyCaseId: string) {
  return db.orm.public.AuditEvent.where({ emergencyCaseId }).all();
}
