import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { useAppStore, AmbulanceStatus } from '../store/appStore';
import { pushStatusUpdate, fetchActiveEmergency } from '../services/ambulance.service';
import { syncQueue } from '../services/offlineQueue';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useWsEvent } from '../hooks/useWebSocket';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e',
  EN_ROUTE: '#3b82f6',
  ON_SCENE: '#f59e0b',
  TRANSPORTING: '#8b5cf6',
  AT_HOSPITAL: '#06b6d4',
  OFF_DUTY: '#6b7280',
};

const STATUSES: AmbulanceStatus[] = [
  'AVAILABLE',
  'EN_ROUTE',
  'ON_SCENE',
  'TRANSPORTING',
  'AT_HOSPITAL',
  'OFF_DUTY',
];

export default function DashboardScreen() {
  useLocationTracking();

  const {
    ambulanceId,
    registrationNo,
    status,
    currentLatitude,
    currentLongitude,
    isOnline,
    locationTracking,
    pendingQueueCount,
    activeEmergency,
    setStatus,
    setLocationTracking,
    setActiveEmergency,
    refreshQueueCount,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadEmergency = async () => {
    if (!ambulanceId) return;
    try {
      const emergency = await fetchActiveEmergency(ambulanceId);
      if (emergency) {
        setActiveEmergency({
          emergencyCaseId: emergency.emergencyCaseId,
          state: emergency.state,
          priority: emergency.priority ?? 'HIGH',
          patientId: emergency.patientId ?? '',
          chiefComplaint: (emergency as any).chiefComplaint ?? null,
          destinationHospitalId: (emergency as any).destinationHospitalId ?? null,
        });
      } else {
        setActiveEmergency(null);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    loadEmergency();
  }, [ambulanceId]);

  // Real-time updates via WebSocket
  useWsEvent('EMERGENCY_CREATED', () => {
    loadEmergency();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmergency();
    await refreshQueueCount();
    setRefreshing(false);
  };

  const handleStatusChange = async (newStatus: AmbulanceStatus) => {
    if (!ambulanceId) return;
    setStatus(newStatus);
    await pushStatusUpdate(ambulanceId, newStatus);
    await refreshQueueCount();
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncQueue();
    await refreshQueueCount();
    setSyncing(false);

    if (result) {
      Alert.alert(
        'Sync Complete',
        `Synced: ${result.synchronized} | Duplicates: ${result.duplicates} | Failed: ${result.failed}`
      );
    } else {
      Alert.alert('Sync', 'No pending operations to sync.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.regNo}>🚑 {registrationNo}</Text>
          <Text style={styles.ambulanceId} numberOfLines={1}>
            ID: {ambulanceId}
          </Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={[styles.dot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Current Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + '22' }]}>
          <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>{status}</Text>
        </View>
      </View>

      {/* Active Emergency */}
      {activeEmergency ? (
        <View style={[styles.section, styles.emergencyCard]}>
          <Text style={styles.emergencyTitle}>🚨 Active Emergency</Text>
          <Row label="Case ID" value={activeEmergency.emergencyCaseId.slice(0, 8) + '...'} />
          <Row label="Priority" value={activeEmergency.priority} highlight />
          <Row label="State" value={activeEmergency.state} />
          {activeEmergency.chiefComplaint && (
            <Row label="Complaint" value={activeEmergency.chiefComplaint} />
          )}
          {activeEmergency.destinationHospitalId && (
            <Row label="Destination" value={activeEmergency.destinationHospitalId.slice(0, 8) + '...'} />
          )}
        </View>
      ) : (
        <View style={[styles.section, styles.noEmergency]}>
          <Text style={styles.noEmergencyText}>✅ No active emergency assigned</Text>
        </View>
      )}

      {/* GPS Location */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>GPS Tracking</Text>
          <Switch
            value={locationTracking}
            onValueChange={setLocationTracking}
            trackColor={{ false: '#334155', true: '#ef4444' }}
            thumbColor={locationTracking ? '#fff' : '#94a3b8'}
          />
        </View>
        {currentLatitude !== null ? (
          <Text style={styles.gpsText}>
            📍 {currentLatitude.toFixed(5)}, {currentLongitude?.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.gpsTextMuted}>Location not yet acquired</Text>
        )}
      </View>

      {/* Change Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Status</Text>
        <View style={styles.statusGrid}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBtn,
                status === s && { borderColor: STATUS_COLORS[s], backgroundColor: STATUS_COLORS[s] + '20' },
              ]}
              onPress={() => handleStatusChange(s)}
            >
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[s] }]} />
              <Text style={[styles.statusBtnText, status === s && { color: STATUS_COLORS[s] }]}>
                {s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Offline Queue */}
      {pendingQueueCount > 0 && (
        <View style={[styles.section, styles.queueCard]}>
          <Text style={styles.queueTitle}>
            📦 {pendingQueueCount} operation{pendingQueueCount > 1 ? 's' : ''} pending sync
          </Text>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={handleSync}
            disabled={syncing}
          >
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}:</Text>
      <Text style={[rowStyles.value, highlight && rowStyles.highlight]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#94a3b8', fontSize: 13 },
  value: { color: '#f1f5f9', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  highlight: { color: '#ef4444', fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 8,
  },
  regNo: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  ambulanceId: { color: '#475569', fontSize: 11, marginTop: 2, maxWidth: 220 },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineText: { color: '#94a3b8', fontSize: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 16, fontWeight: '700' },
  emergencyCard: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  emergencyTitle: { color: '#ef4444', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  noEmergency: {},
  noEmergencyText: { color: '#22c55e', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  gpsText: { color: '#38bdf8', fontSize: 13, marginTop: 4 },
  gpsTextMuted: { color: '#475569', fontSize: 13, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  statusBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  queueCard: { borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  queueTitle: { color: '#f59e0b', fontWeight: '600', marginBottom: 10 },
  syncBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  syncBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
