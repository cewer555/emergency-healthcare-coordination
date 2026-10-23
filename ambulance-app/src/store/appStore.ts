import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQueueLength } from '../services/offlineQueue';

export type AmbulanceStatus =
  | 'AVAILABLE'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'TRANSPORTING'
  | 'AT_HOSPITAL'
  | 'OFF_DUTY';

export interface ActiveEmergency {
  emergencyCaseId: string;
  state: string;
  priority: string;
  patientId: string;
  chiefComplaint?: string | null;
  destinationHospitalId?: string | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
}

interface AppState {
  // Ambulance identity
  ambulanceId: string | null;
  registrationNo: string | null;
  status: AmbulanceStatus;

  // Location
  currentLatitude: number | null;
  currentLongitude: number | null;
  locationTracking: boolean;

  // Active case
  activeEmergency: ActiveEmergency | null;

  // Connectivity
  isOnline: boolean;
  pendingQueueCount: number;

  // Actions
  setAmbulanceId: (id: string, regNo: string) => Promise<void>;
  setStatus: (status: AmbulanceStatus) => void;
  setLocation: (lat: number, lon: number) => void;
  setLocationTracking: (enabled: boolean) => void;
  setActiveEmergency: (emergency: ActiveEmergency | null) => void;
  setOnline: (online: boolean) => void;
  refreshQueueCount: () => Promise<void>;
  loadPersistedState: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ambulanceId: null,
  registrationNo: null,
  status: 'AVAILABLE',
  currentLatitude: null,
  currentLongitude: null,
  locationTracking: false,
  activeEmergency: null,
  isOnline: true,
  pendingQueueCount: 0,

  setAmbulanceId: async (id, regNo) => {
    await AsyncStorage.setItem('ambulanceId', id);
    await AsyncStorage.setItem('registrationNo', regNo);
    set({ ambulanceId: id, registrationNo: regNo });
  },

  setStatus: (status) => set({ status }),

  setLocation: (lat, lon) =>
    set({ currentLatitude: lat, currentLongitude: lon }),

  setLocationTracking: (enabled) => set({ locationTracking: enabled }),

  setActiveEmergency: (emergency) => set({ activeEmergency: emergency }),

  setOnline: (online) => {
    set({ isOnline: online });
  },

  refreshQueueCount: async () => {
    const count = await getQueueLength();
    set({ pendingQueueCount: count });
  },

  loadPersistedState: async () => {
    const ambulanceId = await AsyncStorage.getItem('ambulanceId');
    const registrationNo = await AsyncStorage.getItem('registrationNo');
    const count = await getQueueLength();
    set({
      ambulanceId: ambulanceId ?? null,
      registrationNo: registrationNo ?? null,
      pendingQueueCount: count,
    });
  },
}));
