import { db } from "../prisma/db";

export async function seedMockData() {
  const existingHospitals = await db.orm.public.Hospital.where({}).all();

  // If hospitals exist with codes HOSP-A, HOSP-B, etc., return existing
  const hospACheck = existingHospitals.find((h) => h.code === "HOSP-A");
  if (hospACheck) {
    return {
      message: "Database already contains seed data",
      hospitalsCount: existingHospitals.length,
    };
  }

  // 1. Hospital A: ICU 2 available (Normal matching)
  const hospA = await db.orm.public.Hospital.create({
    name: "Apollo Main Medical Center",
    code: "HOSP-A",
    latitude: 13.06,
    longitude: 80.25,
    address: "21 Greams Lane, Chennai",
    status: "OPERATIONAL",
    emergencyContact: "+91-44-28290200",
    timezone: "Asia/Kolkata",
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospA.hospitalId,
    resourceType: "ICU",
    total: 10,
    available: 2,
    occupied: 6,
    reserved: 1,
    maintenance: 1,
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospA.hospitalId,
    resourceType: "TRAUMA_BAY",
    total: 4,
    available: 2,
    occupied: 2,
    reserved: 0,
    maintenance: 0,
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospA.hospitalId,
    resourceType: "CT",
    total: 2,
    available: 1,
    occupied: 1,
    reserved: 0,
    maintenance: 0,
  });

  await db.orm.public.HospitalCapability.create({
    hospitalId: hospA.hospitalId,
    capabilityType: "TRAUMA_LEVEL_1",
    enabled: true,
  });

  await db.orm.public.HospitalCapability.create({
    hospitalId: hospA.hospitalId,
    capabilityType: "CARDIOLOGY",
    enabled: true,
  });

  // 2. Hospital B: ICU 0 but CT available (Capability/capacity distinction)
  const hospB = await db.orm.public.Hospital.create({
    name: "Fortis Malar Hospital",
    code: "HOSP-B",
    latitude: 13.00,
    longitude: 80.26,
    address: "52 Gandhi Nagar, Adyar, Chennai",
    status: "OPERATIONAL",
    emergencyContact: "+91-44-42892222",
    timezone: "Asia/Kolkata",
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospB.hospitalId,
    resourceType: "ICU",
    total: 8,
    available: 0,
    occupied: 7,
    reserved: 1,
    maintenance: 0,
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospB.hospitalId,
    resourceType: "CT",
    total: 2,
    available: 2,
    occupied: 0,
    reserved: 0,
    maintenance: 0,
  });

  await db.orm.public.HospitalCapability.create({
    hospitalId: hospB.hospitalId,
    capabilityType: "NEUROLOGY",
    enabled: true,
  });

  // 3. Hospital C: Stale resource feed (Freshness handling)
  const hospC = await db.orm.public.Hospital.create({
    name: "Kalyani Memorial Hospital",
    code: "HOSP-C",
    latitude: 13.04,
    longitude: 80.24,
    address: "Radhakrishnan Salai, Mylapore, Chennai",
    status: "OPERATIONAL",
    emergencyContact: "+91-44-28471111",
    timezone: "Asia/Kolkata",
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospC.hospitalId,
    resourceType: "ICU",
    total: 6,
    available: 3,
    occupied: 3,
    reserved: 0,
    maintenance: 0,
  });

  // 4. Hospital D: Specialized Rejection / Transactional test hospital
  const hospD = await db.orm.public.Hospital.create({
    name: "Government General Trauma Hospital",
    code: "HOSP-D",
    latitude: 13.08,
    longitude: 80.28,
    address: "EVR Periyar Salai, Park Town, Chennai",
    status: "BUSY",
    emergencyContact: "+91-44-25305000",
    timezone: "Asia/Kolkata",
  });

  await db.orm.public.HospitalResource.create({
    hospitalId: hospD.hospitalId,
    resourceType: "ICU",
    total: 20,
    available: 0,
    occupied: 18,
    reserved: 2,
    maintenance: 0,
  });

  // Ambulances
  const amb1 = await db.orm.public.Ambulance.create({
    registrationNo: "TN-01-AMB-101",
    status: "AVAILABLE",
    latitude: 13.07,
    longitude: 80.26,
    crewDetails: "Paramedic Kumar, EMT Priya",
    equipmentSummary: "Defibrillator, Ventilator, Telemetry, IV Kit",
  });

  const amb2 = await db.orm.public.Ambulance.create({
    registrationNo: "TN-01-AMB-202",
    status: "AVAILABLE",
    latitude: 13.02,
    longitude: 80.24,
    crewDetails: "Paramedic Anand, EMT Divya",
    equipmentSummary: "Basic Life Support, Splints, O2 Tank",
  });

  // Test Patient
  const patient = await db.orm.public.Patient.create({
    name: "Ramesh Sharma",
    age: 48,
    sex: "MALE",
    bloodGroup: "O+",
    emergencyNotes: "Known diabetic, suspected polytrauma following road traffic collision",
  });

  // Vital readings
  await db.orm.public.VitalReading.create({
    patientId: patient.patientId,
    heartRate: 118,
    respiratoryRate: 24,
    oxygenSaturation: 91.0,
    systolicBP: 88,
    diastolicBP: 58,
    temperature: 37.1,
    consciousness: "CONFUSED",
  });

  return {
    message: "Seed data successfully inserted per Master Blueprint Section 18",
    hospitals: [hospA.code, hospB.code, hospC.code, hospD.code],
    ambulances: [amb1.registrationNo, amb2.registrationNo],
    patientId: patient.patientId,
  };
}
