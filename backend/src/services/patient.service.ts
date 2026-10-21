import { db } from "../prisma/db";
import { AppError } from "../middleware/error.middleware";
import { predictDeteriorationRisk } from "./ai.service";
import { wsService } from "./websocket.service";

export interface CreatePatientInput {
  name?: string | null;
  age?: number | null;
  sex?: string | null;
  bloodGroup?: string | null;
  emergencyNotes?: string | null;
}

export interface VitalReadingInput {
  heartRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  temperature?: number | null;
  consciousness?: string | null;
  quality?: string;
}

export async function createPatient(data: CreatePatientInput) {
  return db.orm.public.Patient.create({
    name: data.name ?? null,
    age: data.age ?? null,
    sex: data.sex ?? null,
    bloodGroup: data.bloodGroup ?? null,
    emergencyNotes: data.emergencyNotes ?? null,
  });
}

export async function getPatientById(patientId: string) {
  const patient = await db.orm.public.Patient.where({ patientId }).first();
  if (!patient) return null;

  const vitals = await db.orm.public.VitalReading.where({ patientId }).all();

  return {
    ...patient,
    vitals,
  };
}

export async function updatePatient(
  patientId: string,
  data: Partial<CreatePatientInput>
) {
  const existing = await db.orm.public.Patient.where({ patientId }).first();
  if (!existing) {
    throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found");
  }

  return db.orm.public.Patient.where({ patientId }).update({
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.age !== undefined ? { age: data.age } : {}),
    ...(data.sex !== undefined ? { sex: data.sex } : {}),
    ...(data.bloodGroup !== undefined ? { bloodGroup: data.bloodGroup } : {}),
    ...(data.emergencyNotes !== undefined
      ? { emergencyNotes: data.emergencyNotes }
      : {}),
  });
}

export async function appendVitalReading(
  patientId: string,
  vitals: VitalReadingInput,
  correlationId?: string
) {
  const patient = await db.orm.public.Patient.where({ patientId }).first();
  if (!patient) {
    throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found");
  }

  // Physiological plausibility validation
  if (
    vitals.heartRate !== null &&
    vitals.heartRate !== undefined &&
    (vitals.heartRate < 20 || vitals.heartRate > 300)
  ) {
    throw new AppError(
      422,
      "PHYSIOLOGICALLY_IMPLAUSIBLE_VITAL",
      `Heart rate ${vitals.heartRate} is invalid`
    );
  }
  if (
    vitals.systolicBP !== null &&
    vitals.systolicBP !== undefined &&
    (vitals.systolicBP < 25 || vitals.systolicBP > 320)
  ) {
    throw new AppError(
      422,
      "PHYSIOLOGICALLY_IMPLAUSIBLE_VITAL",
      `Systolic BP ${vitals.systolicBP} is invalid`
    );
  }
  if (
    vitals.oxygenSaturation !== null &&
    vitals.oxygenSaturation !== undefined &&
    (vitals.oxygenSaturation < 20 || vitals.oxygenSaturation > 100)
  ) {
    throw new AppError(
      422,
      "PHYSIOLOGICALLY_IMPLAUSIBLE_VITAL",
      `Oxygen saturation ${vitals.oxygenSaturation} is invalid`
    );
  }

  const reading = await db.orm.public.VitalReading.create({
    patientId,
    heartRate: vitals.heartRate ?? null,
    respiratoryRate: vitals.respiratoryRate ?? null,
    oxygenSaturation: vitals.oxygenSaturation ?? null,
    systolicBP: vitals.systolicBP ?? null,
    diastolicBP: vitals.diastolicBP ?? null,
    temperature: vitals.temperature ?? null,
    consciousness: vitals.consciousness ?? null,
  });

  // Evaluate deterioration risk
  const allVitals = await db.orm.public.VitalReading.where({ patientId }).all();
  const riskAnalysis = await predictDeteriorationRisk({
    patientId,
    vitals: allVitals.map((v) => ({
      heartRate: v.heartRate ?? undefined,
      respiratoryRate: v.respiratoryRate ?? undefined,
      oxygenSaturation: v.oxygenSaturation ?? undefined,
      systolicBP: v.systolicBP ?? undefined,
      diastolicBP: v.diastolicBP ?? undefined,
      temperature: v.temperature ?? undefined,
      consciousness: v.consciousness ?? undefined,
    })),
    quality: vitals.quality,
  });

  // Update associated active EmergencyCase if present
  const linkedEmergency = await db.orm.public.EmergencyCase.where({
    patientId,
  }).first();

  if (linkedEmergency) {
    await db.orm.public.EmergencyCase.where({
      emergencyCaseId: linkedEmergency.emergencyCaseId,
    }).update({
      riskLevel: riskAnalysis.risk_level,
    });

    if (
      riskAnalysis.risk_level === "CRITICAL" ||
      riskAnalysis.risk_level === "HIGH"
    ) {
      wsService.emitEvent({
        eventType: "ALERT_CREATED",
        entityType: "patient",
        entityId: patientId,
        correlationId,
        emergencyId: linkedEmergency.emergencyCaseId,
        payload: {
          alertType: "PATIENT_DETERIORATION_WARNING",
          patientId,
          emergencyId: linkedEmergency.emergencyCaseId,
          riskLevel: riskAnalysis.risk_level,
          riskScore: riskAnalysis.risk_score,
          contributingFeatures: riskAnalysis.contributing_features,
          latestReading: reading,
        },
      });
    }
  }

  return {
    vitalReading: reading,
    deteriorationRisk: riskAnalysis,
  };
}

export async function getPatientVitalHistory(patientId: string) {
  const patient = await db.orm.public.Patient.where({ patientId }).first();
  if (!patient) {
    throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found");
  }

  return db.orm.public.VitalReading.where({ patientId }).all();
}
