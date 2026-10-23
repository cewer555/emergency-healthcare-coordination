import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store/appStore';
import { pushLocationUpdate } from '../services/ambulance.service';

const LOCATION_INTERVAL_MS = 5000; // push location every 5 seconds

export function useLocationTracking() {
  const ambulanceId = useAppStore((s) => s.ambulanceId);
  const isTracking = useAppStore((s) => s.locationTracking);
  const setLocation = useAppStore((s) => s.setLocation);
  const refreshQueueCount = useAppStore((s) => s.refreshQueueCount);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isTracking || !ambulanceId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const track = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      intervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const { latitude, longitude, heading, speed } = loc.coords;
          setLocation(latitude, longitude);

          const sent = await pushLocationUpdate(
            ambulanceId,
            latitude,
            longitude,
            heading ?? undefined,
            speed ?? undefined
          );

          if (!sent) {
            refreshQueueCount();
          }
        } catch {
          // Location error — ignore
        }
      }, LOCATION_INTERVAL_MS);
    };

    track();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking, ambulanceId]);
}
