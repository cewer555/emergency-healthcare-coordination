import type { Request, Response, NextFunction } from "express";
import {
  evaluateResourceRequirements,
  predictDeteriorationRisk,
  forecastCapacity,
  allocateMassCasualty,
  executeCommandAssistantQuery,
  evaluateEcgAssistance,
  normalizeVoiceInput,
} from "../services/ai.service";
import { AppError } from "../middleware/error.middleware";

// POST /api/ai/patient-requirements (Section 9.1)
export async function patientRequirementsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await evaluateResourceRequirements(req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ai/deterioration-risk (Section 9.2)
export async function deteriorationRiskHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patient_id, patientId, window_minutes, windowMinutes, vitals, quality } = req.body;

    if (!Array.isArray(vitals)) {
      throw new AppError(400, "VALIDATION_ERROR", "vitals must be an array");
    }

    const result = await predictDeteriorationRisk({
      patientId: patientId || patient_id,
      windowMinutes: windowMinutes || window_minutes || 30,
      vitals,
      quality,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ai/capacity-forecast (Section 9.3)
export async function capacityForecastHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { hospital_id, hospitalId, resource_type, resourceType = "ICU" } = req.body;
    const targetHospitalId = hospitalId || hospital_id;

    if (!targetHospitalId) {
      throw new AppError(400, "VALIDATION_ERROR", "hospital_id is required");
    }

    const result = await forecastCapacity(targetHospitalId, resourceType || resource_type);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ai/mass-casualty (Section 9.6)
export async function massCasualtyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { incident_id, incidentId = "MCI-DEFAULT", casualties } = req.body;

    if (!Array.isArray(casualties) || casualties.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "casualties must be a non-empty array");
    }

    const result = await allocateMassCasualty({
      incidentId: incidentId || incident_id,
      casualties,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ai/command-assistant (Section 9.7)
export async function commandAssistantHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { query } = req.body;

    if (!query) {
      throw new AppError(400, "VALIDATION_ERROR", "query string is required");
    }

    const result = await executeCommandAssistantQuery(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ai/ecg (Section 9.4)
export async function ecgAssistanceHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { emergency_case_id, emergencyCaseId, ecg_data, signal_quality, signalQuality, acquisition_metadata, acquisitionMetadata } = req.body;

    const result = await evaluateEcgAssistance({
      emergencyCaseId: emergencyCaseId || emergency_case_id,
      ecgDataReference: ecg_data,
      signalQuality: signalQuality || signal_quality,
      acquisitionMetadata: acquisitionMetadata || acquisition_metadata,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ai/voice (Section 9.5)
export async function voiceNormalizationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { transcript, audio_reference, audioReference, language } = req.body;

    const result = await normalizeVoiceInput({
      transcript,
      audioReference: audioReference || audio_reference,
      language,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
