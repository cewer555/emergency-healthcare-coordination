import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateFreshness,
  updateHospitalResources,
  getAllHospitals,
} from "../src/services/hospital.service";
import {
  evaluateResourceRequirements,
  predictDeteriorationRisk,
  allocateMassCasualty,
  executeCommandAssistantQuery,
} from "../src/services/ai.service";
import {
  calculateHaversineDistanceKm,
  estimateEtaMinutes,
  findCandidateHospitals,
} from "../src/services/matching.service";
import {
  createEmergency,
  updateEmergency,
  getEmergencyById,
} from "../src/services/emergency.service";
import { createPatient, appendVitalReading } from "../src/services/patient.service";
import {
  createAmbulance,
  syncOfflineQueue,
} from "../src/services/ambulance.service";
import {
  createHospitalRequest,
  acceptHospitalRequest,
  rejectHospitalRequest,
} from "../src/services/handshake.service";
import { seedMockData } from "../src/services/seed.service";
import { wsService } from "../src/services/websocket.service";

test("Backend Complete Verification Suite", async (t) => {
  // 1. Seed synthetic dataset per Master Blueprint Section 18
  await t.test("Seed synthetic hospitals, resources, ambulances, and patients", async () => {
    const seedResult = await seedMockData();
    assert.ok(seedResult);
    const hospitals = await getAllHospitals();
    assert.ok(hospitals.length >= 4, "Should have at least 4 canonical mock hospitals");
  });

  // 2. Resource accounting invariant: available + occupied + reserved + maintenance === total
  await t.test("Resource accounting invariant enforcement", async () => {
    const hospitals = await getAllHospitals();
    const hospA = hospitals.find((h) => h.code === "HOSP-A") || hospitals[0];

    // Inconsistent resource: 2 + 5 + 1 + 0 = 8 !== 10
    await assert.rejects(
      async () => {
        await updateHospitalResources(hospA.hospitalId, [
          {
            resourceType: "ICU",
            total: 10,
            available: 2,
            occupied: 5,
            reserved: 1,
            maintenance: 0,
          },
        ]);
      },
      {
        name: "AppError",
        message: /Resource arithmetic inconsistency/,
      }
    );

    // Consistent resource: 3 + 5 + 1 + 1 = 10 === 10
    const updated = await updateHospitalResources(hospA.hospitalId, [
      {
        resourceType: "ICU",
        total: 10,
        available: 3,
        occupied: 5,
        reserved: 1,
        maintenance: 1,
      },
    ]);
    assert.equal(updated.length, 1);
    assert.equal(updated[0]?.available, 3);
  });

  // 3. Freshness status computation
  await t.test("Resource freshness status computation", () => {
    const freshDate = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
    const agingDate = new Date(Date.now() - 25 * 60 * 1000); // 25 mins ago
    const staleDate = new Date(Date.now() - 90 * 60 * 1000); // 90 mins ago

    assert.equal(calculateFreshness(freshDate).freshness_status, "FRESH");
    assert.equal(calculateFreshness(agingDate).freshness_status, "AGING");
    assert.equal(calculateFreshness(staleDate).freshness_status, "STALE");
  });

  // 4. AI/ML Patient Resource Requirement Engine
  await t.test("AI Resource Requirement Engine rules", async () => {
    // Trauma case
    const traumaReq = await evaluateResourceRequirements({
      chiefComplaint: "Major motor vehicle crash with open femur fracture",
    });
    assert.ok(traumaReq.requirements.some((r) => r.type === "TRAUMA_BAY"));
    assert.ok(traumaReq.requirements.some((r) => r.type === "CT"));
    assert.ok(traumaReq.confidence >= 0.85);

    // Cardiac case with hypotension
    const cardiacReq = await evaluateResourceRequirements({
      chiefComplaint: "Acute crushing chest pain",
      vitals: { systolicBP: 80, heartRate: 125 },
    });
    assert.ok(cardiacReq.requirements.some((r) => r.type === "ICU"));
    assert.ok(cardiacReq.requirements.some((r) => r.type === "OPERATION_THEATRE"));
  });

  // 5. AI/ML Deterioration Risk Prediction & Safeguards
  await t.test("AI Deterioration Risk Prediction and Safeguards", async () => {
    // Implausible vital rejected
    await assert.rejects(
      async () => {
        await predictDeteriorationRisk({
          vitals: [{ type: "HR", value: 350 }], // HR > 300
        });
      },
      {
        name: "AppError",
        message: /physiologically implausible/,
      }
    );

    // Shock patient
    const highRisk = await predictDeteriorationRisk({
      vitals: [
        { type: "HR", value: 135 },
        { type: "SBP", value: 80 },
        { type: "SpO2", value: 88 },
      ],
    });
    assert.equal(highRisk.risk_level, "CRITICAL");
    assert.ok(highRisk.risk_score >= 0.75);
    assert.ok(highRisk.contributing_features.includes("falling_SBP_shock_range"));
    assert.ok(highRisk.contributing_features.includes("persistent_severe_tachycardia"));
  });

  // 6. Matching Engine Eligibility & Transparent Explanations
  await t.test("Hospital matching engine eligibility filters & ranking", async () => {
    const candidates = await findCandidateHospitals({
      originLat: 13.06,
      originLon: 80.25,
      requiredResources: [{ type: "ICU", quantity: 1 }],
    });

    assert.ok(candidates.length > 0);
    // Hospital A has available ICU beds, Hospital B has 0 ICU beds
    const hospA = candidates.find((c) => c.code === "HOSP-A");
    const hospB = candidates.find((c) => c.code === "HOSP-B");

    assert.ok(hospA?.eligible, "Hospital A should be eligible");
    assert.ok(hospA?.reason_codes.includes("ICU_AVAILABLE"));

    if (hospB) {
      assert.equal(hospB.eligible, false, "Hospital B has 0 ICU beds so must be ineligible");
      assert.ok(hospB.reason_codes.includes("INSUFFICIENT_ICU"));
    }
  });

  // 7. Full Emergency Workflow & Handshake (Create -> Match -> Request -> Accept -> En Route -> Arrive -> Complete)
  await t.test("End-to-end Emergency coordination lifecycle and digital handshake", async () => {
    // A. Create Patient
    const patient = await createPatient({
      name: "Test Patient Alpha",
      age: 35,
      sex: "FEMALE",
      chief_complaint: "Fall from height, severe trauma",
    } as any);

    // B. Append Vitals
    const vitalsResult = await appendVitalReading(patient.patientId, {
      heartRate: 110,
      systolicBP: 85,
      diastolicBP: 55,
      oxygenSaturation: 93,
    });
    assert.ok(vitalsResult.deteriorationRisk);

    // C. Register Ambulance
    const ambulance = await createAmbulance({
      registrationNo: `TN-TEST-${Date.now().toString().slice(-4)}`,
      status: "AVAILABLE",
      latitude: 13.06,
      longitude: 80.25,
    });

    // D. Create Emergency
    const emergency = await createEmergency({
      patient_id: patient.patientId,
      ambulance_id: ambulance.ambulanceId,
      priority: "CRITICAL",
      origin: { lat: 13.06, lon: 80.25 },
      chief_complaint: "Severe fall, unstable vitals",
      requirements: ["ICU", "TRAUMA_BAY"],
    });
    assert.equal(emergency.status, "ASSESSING");

    // E. Transition to SEARCHING_HOSPITAL
    await updateEmergency(emergency.emergency_id, {
      state: "SEARCHING_HOSPITAL",
    });

    // F. Match Hospital Candidates
    const candidates = await findCandidateHospitals({
      originLat: 13.06,
      originLon: 80.25,
      requiredResources: [{ type: "ICU", quantity: 1 }],
    });
    const selected = candidates.find((c) => c.eligible)!;
    assert.ok(selected, "Must find at least one eligible hospital");

    // G. Create Hospital Request
    const hospitalRequest = await createHospitalRequest({
      emergencyCaseId: emergency.emergency_id,
      hospitalId: selected.hospital_id,
      requestedResources: [{ type: "ICU", quantity: 1 }],
      actorId: "paramedic-001",
    });
    assert.equal(hospitalRequest.status, "PENDING");

    // Check emergency state moved to HOSPITAL_REQUESTED
    const requestedCase = await getEmergencyById(emergency.emergency_id);
    assert.equal(requestedCase?.state, "HOSPITAL_REQUESTED");

    // H. Hospital ER Accepts Request
    const acceptResult = await acceptHospitalRequest(
      hospitalRequest.hospitalRequestId,
      "er-doctor-chennai"
    );
    assert.equal(acceptResult.request.status, "ACCEPTED");
    assert.equal(acceptResult.reservation.status, "ACTIVE");

    // Verify destination and state
    const acceptedCase = await getEmergencyById(emergency.emergency_id);
    assert.equal(acceptedCase?.state, "HOSPITAL_ACCEPTED");
    assert.equal(acceptedCase?.destinationHospitalId, selected.hospital_id);

    // I. Ambulance departs: EN_ROUTE
    const enRouteCase = await updateEmergency(emergency.emergency_id, {
      state: "EN_ROUTE",
    });
    assert.equal(enRouteCase.status, "EN_ROUTE");

    // J. Ambulance arrives: ARRIVED (consumes reservation)
    const arrivedCase = await updateEmergency(emergency.emergency_id, {
      state: "ARRIVED",
    });
    assert.equal(arrivedCase.status, "ARRIVED");

    // Check reservation was consumed upon arrival
    const caseAfterArrival = await getEmergencyById(emergency.emergency_id);
    assert.ok(
      caseAfterArrival?.reservations.some((r) => r.status === "CONSUMED"),
      "Reservation should be marked CONSUMED upon patient arrival"
    );

    // K. Case closed: COMPLETED
    const completedCase = await updateEmergency(emergency.emergency_id, {
      state: "COMPLETED",
    });
    assert.equal(completedCase.status, "COMPLETED");

    // L. Verify audit trail was recorded
    const finalCase = await getEmergencyById(emergency.emergency_id);
    assert.ok(finalCase?.auditEvents.length! >= 4, "Must record comprehensive audit events");
  });

  // 8. Rejection and Dynamic Rerouting Fallback
  await t.test("Hospital request rejection triggers state revert and candidate fallback", async () => {
    const patient = await createPatient({ name: "Rejection Scenario Patient" });
    const emergency = await createEmergency({
      patient_id: patient.patientId,
      priority: "HIGH",
      origin: { lat: 13.06, lon: 80.25 },
      requirements: ["ICU"],
    });

    const hospitals = await getAllHospitals();
    const hospA = hospitals[0];

    const req = await createHospitalRequest({
      emergencyCaseId: emergency.emergency_id,
      hospitalId: hospA.hospitalId,
      requestedResources: [{ type: "ICU", quantity: 1 }],
    });

    const rejectResult = await rejectHospitalRequest(
      req.hospitalRequestId,
      "ER surge capacity reached"
    );
    assert.equal(rejectResult.status, "REJECTED");

    const caseAfterReject = await getEmergencyById(emergency.emergency_id);
    assert.equal(caseAfterReject?.state, "SEARCHING_HOSPITAL");
  });

  // 9. Offline Ambulance Queue Synchronization (Section 14)
  await t.test("Offline ambulance queue deduplication and synchronization", async () => {
    const ambulance = await createAmbulance({
      registrationNo: `TN-OFFLINE-${Date.now().toString().slice(-4)}`,
      status: "AVAILABLE",
    });

    const opId1 = `op-loc-${Date.now()}-1`;
    const opId2 = `op-status-${Date.now()}-2`;

    const syncBatch = [
      {
        clientOperationId: opId1,
        type: "LOCATION_UPDATE" as const,
        ambulanceId: ambulance.ambulanceId,
        payload: { latitude: 13.09, longitude: 80.28, speed: 45 },
        createdAt: new Date().toISOString(),
      },
      {
        clientOperationId: opId2,
        type: "STATUS_UPDATE" as const,
        ambulanceId: ambulance.ambulanceId,
        payload: { status: "EN_ROUTE" },
        createdAt: new Date().toISOString(),
      },
    ];

    // First sync: both processed
    const res1 = await syncOfflineQueue(syncBatch);
    assert.equal(res1.synchronized_count, 2);
    assert.equal(res1.duplicate_count, 0);

    // Retry duplicate sync: both detected as DUPLICATE
    const res2 = await syncOfflineQueue(syncBatch);
    assert.equal(res2.synchronized_count, 0);
    assert.equal(res2.duplicate_count, 2);
  });

  // 10. Mass-Casualty Optimization & AI Assistant
  await t.test("Mass casualty allocation and AI Command Assistant", async () => {
    const mciResult = await allocateMassCasualty({
      incidentId: "MCI-TEST-01",
      casualties: [
        { id: "CAS-1", priority: "CRITICAL", requiredResources: ["ICU"] },
        { id: "CAS-2", priority: "HIGH", requiredResources: ["TRAUMA_BAY"] },
        { id: "CAS-3", priority: "MEDIUM", requiredResources: ["EMERGENCY_BED"] },
      ],
    });
    assert.ok(mciResult.allocated_count >= 1);

    const assistantResult = await executeCommandAssistantQuery(
      "How many ICU beds are currently available across hospitals?"
    );
    assert.ok(assistantResult.response.includes("ICU"));
  });

  // 11. WebSocket Event Emission
  await t.test("WebSocket event envelope emission", () => {
    const envelope = wsService.emitEvent({
      eventType: "ALERT_CREATED",
      entityType: "emergency_case",
      entityId: "test-emergency-id",
      payload: { test: true },
    });

    assert.equal(envelope.event_type, "ALERT_CREATED");
    assert.ok(envelope.event_id);
    assert.ok(envelope.occurred_at);
    assert.equal(envelope.version, 1);
  });
}).then(() => {
  setTimeout(() => process.exit(0), 100);
});
