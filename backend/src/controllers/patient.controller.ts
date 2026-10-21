import type { Request, Response, NextFunction } from "express";
import {
  createPatient,
  getPatientById,
  updatePatient,
  appendVitalReading,
  getPatientVitalHistory,
} from "../services/patient.service";
import { AppError } from "../middleware/error.middleware";

// POST /api/patients
export async function createPatientHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, age, sex, bloodGroup, emergencyNotes } = req.body;

    const patient = await createPatient({
      name,
      age: age ? Number(age) : null,
      sex,
      bloodGroup,
      emergencyNotes,
    });

    res.status(201).json({
      success: true,
      message: "Patient record created successfully",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/patients/:patientId
export async function getPatientHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientId = String(req.params.patientId);
    const patient = await getPatientById(patientId);

    if (!patient) {
      throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found");
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/patients/:patientId
export async function updatePatientHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientId = String(req.params.patientId);
    const { name, age, sex, bloodGroup, emergencyNotes } = req.body;

    const updated = await updatePatient(patientId, {
      name,
      age: age ? Number(age) : undefined,
      sex,
      bloodGroup,
      emergencyNotes,
    });

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/patients/:patientId/vitals
export async function appendVitalReadingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientId = String(req.params.patientId);
    const {
      heartRate,
      respiratoryRate,
      oxygenSaturation,
      systolicBP,
      diastolicBP,
      temperature,
      consciousness,
      quality,
    } = req.body;

    const result = await appendVitalReading(
      patientId,
      {
        heartRate: heartRate !== undefined ? Number(heartRate) : null,
        respiratoryRate:
          respiratoryRate !== undefined ? Number(respiratoryRate) : null,
        oxygenSaturation:
          oxygenSaturation !== undefined ? Number(oxygenSaturation) : null,
        systolicBP: systolicBP !== undefined ? Number(systolicBP) : null,
        diastolicBP: diastolicBP !== undefined ? Number(diastolicBP) : null,
        temperature: temperature !== undefined ? Number(temperature) : null,
        consciousness,
        quality,
      },
      req.correlationId
    );

    res.status(201).json({
      success: true,
      message: "Vital reading appended",
      data: result.vitalReading,
      deteriorationRisk: result.deteriorationRisk,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/patients/:patientId/vitals
export async function getPatientVitalsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientId = String(req.params.patientId);
    const vitals = await getPatientVitalHistory(patientId);

    res.status(200).json({
      success: true,
      patient_id: patientId,
      count: vitals.length,
      data: vitals,
    });
  } catch (error) {
    next(error);
  }
}
