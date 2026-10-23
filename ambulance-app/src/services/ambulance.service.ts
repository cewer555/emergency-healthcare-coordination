import { apiClient } from '../lib/apiClient';
import { enqueue, syncQueue } from './offlineQueue';
import NetInfo from '@react-native-community/netinfo';

// Wraps a location update — sends live if online, enqueues if offline
export async function pushLocationUpdate(
  ambulanceId: string,
  latitude: number,
  longitude: number,
  heading?: number,
  speed?: number
): Promise<boolean> {
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected && netState.isInternetReachable;

  const payload = { latitude, longitude, heading, speed };

  if (isOnline) {
    try {
      await apiClient.put(`/api/ambulances/${ambulanceId}/location`, payload);

      // Attempt to drain any queued operations now that we're online
      syncQueue().catch(() => null);
      return true;
    } catch {
      // Network error despite NetInfo saying online — still queue it
    }
  }

  await enqueue('LOCATION_UPDATE', ambulanceId, payload);
  return false;
}

// Push ambulance status update
export async function pushStatusUpdate(
  ambulanceId: string,
  status: string
): Promise<boolean> {
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected && netState.isInternetReachable;

  if (isOnline) {
    try {
      await apiClient.put(`/api/ambulances/${ambulanceId}/status`, { status });
      syncQueue().catch(() => null);
      return true;
    } catch {
      // fall through to queue
    }
  }

  await enqueue('STATUS_UPDATE', ambulanceId, { status });
  return false;
}

// Push vital reading for a patient
export async function pushVitalReading(
  ambulanceId: string,
  patientId: string,
  vitals: {
    heartRate?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    systolicBP?: number;
    diastolicBP?: number;
    temperature?: number;
    consciousness?: string;
  }
): Promise<{ deteriorationRisk?: unknown } | null> {
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected && netState.isInternetReachable;

  if (isOnline) {
    try {
      const res = await apiClient.post(`/api/patients/${patientId}/vitals`, vitals);
      return res.data;
    } catch {
      // fall through to queue
    }
  }

  await enqueue('VITAL_READING', ambulanceId, { patientId, vitals });
  return null;
}

export async function fetchAmbulance(ambulanceId: string) {
  const res = await apiClient.get(`/api/ambulances/${ambulanceId}`);
  return res.data.data;
}

export async function fetchActiveEmergency(ambulanceId: string) {
  const res = await apiClient.get(`/api/emergencies`);
  const all = res.data.data as Array<{
    ambulanceId: string;
    state: string;
    emergencyCaseId: string;
    priority: string;
    patientId: string;
    chiefComplaint?: string | null;
    destinationHospitalId?: string | null;
  }>;
  return all.find(
    (e) =>
      e.ambulanceId === ambulanceId &&
      !['COMPLETED', 'CANCELLED'].includes(e.state)
  ) ?? null;
}
