import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { ambulanceId, registrationNo, pendingQueueCount, setAmbulanceId } = useAppStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('ambulanceId');
          await AsyncStorage.removeItem('registrationNo');
          // Force re-render by clearing store
          useAppStore.setState({
            ambulanceId: null,
            registrationNo: null,
            activeEmergency: null,
            locationTracking: false,
          });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚙️ Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ambulance Identity</Text>
        <Row label="Registration No." value={registrationNo ?? '—'} />
        <Row label="Ambulance ID" value={ambulanceId ? ambulanceId.slice(0, 16) + '...' : '—'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Offline Queue</Text>
        <Row label="Pending Operations" value={String(pendingQueueCount)} />
        <Text style={styles.hint}>
          Operations enqueued while offline are automatically synced when network is restored.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Row label="App" value="Emergency Ambulance Crew App" />
        <Row label="Version" value="1.0.0" />
        <Row label="Role" value="PARAMEDIC" />
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#64748b', fontSize: 13 },
  value: { color: '#f1f5f9', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  hint: { color: '#475569', fontSize: 12, lineHeight: 17, marginTop: 4 },
  signOutBtn: { backgroundColor: '#7f1d1d', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  signOutText: { color: '#fca5a5', fontWeight: '700', fontSize: 15 },
});
