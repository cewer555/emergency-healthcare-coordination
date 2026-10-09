import { db } from "../prisma/db";

// Get all hospitals
export async function getAllHospitals() {
  return db.orm.public.Hospital.where({}).all();
}

// Get a hospital by ID
export async function getHospitalById(hospitalId: string) {
  return db.orm.public.Hospital.where({ hospitalId }).first();
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