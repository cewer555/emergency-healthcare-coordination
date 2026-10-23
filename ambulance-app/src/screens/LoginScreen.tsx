import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/apiClient';

export default function LoginScreen() {
  const [registrationNo, setRegistrationNo] = useState('');
  const [loading, setLoading] = useState(false);
  const setAmbulanceId = useAppStore((s) => s.setAmbulanceId);

  const handleLogin = async () => {
    const trimmed = registrationNo.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter your ambulance registration number.');
      return;
    }

    setLoading(true);
    try {
      // Fetch ambulance list and find by registration number
      const res = await apiClient.get('/api/ambulances');
      const ambulances = res.data.data as Array<{
        ambulanceId: string;
        registrationNo: string;
        status: string;
      }>;

      const match = ambulances.find((a) => a.registrationNo === trimmed);

      if (!match) {
        Alert.alert(
          'Not Found',
          `No ambulance with registration "${trimmed}" found in the system. Contact your dispatch center.`
        );
        return;
      }

      await setAmbulanceId(match.ambulanceId, match.registrationNo);
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoBox}>
          <Text style={styles.logo}>🚑</Text>
          <Text style={styles.title}>Emergency Response</Text>
          <Text style={styles.subtitle}>Ambulance Crew App</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Ambulance Registration No.</Text>
          <TextInput
            style={styles.input}
            value={registrationNo}
            onChangeText={setRegistrationNo}
            placeholder="e.g. TN-01-AMB-101"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Enter your vehicle registration number to log in as a paramedic crew.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 16,
    letterSpacing: 1,
  },
  btn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 300,
    lineHeight: 18,
  },
});
