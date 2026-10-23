import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/apiClient';
import { randomUUID } from '../lib/uuid';

const QUEUE_KEY = 'offline_op_queue';

export type OfflineOpType = 'LOCATION_UPDATE' | 'STATUS_UPDATE' | 'VITAL_READING';

export interface OfflineOperation {
  clientOperationId: string;
  type: OfflineOpType;
  ambulanceId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// Load current queue from storage
async function loadQueue(): Promise<OfflineOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Save queue to storage
async function saveQueue(queue: OfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Enqueue an operation (used when offline)
export async function enqueue(
  type: OfflineOpType,
  ambulanceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    clientOperationId: randomUUID(),
    type,
    ambulanceId,
    payload,
    createdAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}

// Sync all queued operations with the backend
export async function syncQueue(): Promise<{
  synchronized: number;
  duplicates: number;
  failed: number;
} | null> {
  const queue = await loadQueue();
  if (queue.length === 0) return null;

  try {
    const res = await apiClient.post('/api/ambulances/sync', { operations: queue });
    const result = res.data.data;

    // Clear successfully synced operations from local queue
    const failedIds = new Set<string>(
      (result.results as Array<{ clientOperationId: string; status: string }>)
        .filter((r) => r.status === 'FAILED')
        .map((r) => r.clientOperationId)
    );

    const remaining = queue.filter((op) => failedIds.has(op.clientOperationId));
    await saveQueue(remaining);

    return {
      synchronized: result.synchronized_count,
      duplicates: result.duplicate_count,
      failed: result.failed_count,
    };
  } catch {
    // Network still unavailable — keep the queue intact
    return null;
  }
}

export async function getQueueLength(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}
