import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/apiClient';
import { pushVitalReading } from '../services/ambulance.service';

interface PatientForm {
  name: string;
  age: string;
  sex: string;
  bloodGroup: string;
  chiefComplaint: string;
  emergencyNotes: string;
}

interface VitalsForm {
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  systolicBP: string;
  diastolicBP: string;
  temperature: string;
  consciousness: string;
}

export default function PatientScreen() {
  const ambulanceId = useAppStore((s) => s.ambulanceId);
  const activeEmergency = useAppStore((s) => s.activeEmergency);
  const setActiveEmergency = useAppStore((s) => s.setActiveEmergency);

  const [step, setStep] = useState<'patient' | 'vitals' | 'done'>('patient');
  const [loading, setLoading] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
  const [deteriorationRisk, setDeteriorationRisk] = useState<{
    risk_level: string;
    risk_score: number;
    contributing_features: string[];
  } | null>(null);

  const [patient, setPatient] = useState<PatientForm>({
    name: '',
    age: '',
    sex: '',
    bloodGroup: '',
    chiefComplaint: '',
    emergencyNotes: '',
  });

  const [vitals, setVitals] = useState<VitalsForm>({
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    systolicBP: '',
    diastolicBP: '',
    temperature: '',
    consciousness: 'ALERT',
  });

  const handleCreatePatient = async () => {
    if (!patient.name.trim() && !patient.chiefComplaint.trim()) {
      Alert.alert('Required', 'Please provide at least a name or chief complaint.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create patient
      const patientRes = await apiClient.post('/api/patients', {
        name: patient.name || null,
        age: patient.age ? Number(patient.age) : null,
        sex: patient.sex || null,
        bloodGroup: patient.bloodGroup || null,
        emergencyNotes: patient.emergencyNotes || null,
      });

      const patientId = patientRes.data.data.patientId;
      setCreatedPatientId(patientId);

      // 2. Create emergency case linked to this patient and ambulance
      const emergencyRes = await apiClient.post('/api/emergencies', {
        patient_id: patientId,
        ambulance_id: ambulanceId,
        priority: 'HIGH',
        chief_complaint: patient.chiefComplaint || null,
      });

      const emergency = emergencyRes.data;
      setActiveEmergency({
        emergencyCaseId: emergency.emergency_id,
        state: emergency.state,
        priority: emergency.priority,
        patientId,
        chiefComplaint: patient.chiefComplaint || null,
        destinationHospitalId: null,
      });

      setStep('vitals');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message ?? 'Failed to create patient record.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVitals = async () => {
    if (!createdPatientId || !ambulanceId) return;

    setLoading(true);
    try {
      const vitalsPayload: Record<string, number | string | null> = {
        consciousness: vitals.consciousness || 'ALERT',
      };
      if (vitals.heartRate) vitalsPayload.heartRate = Number(vitals.heartRate);
      if (vitals.respiratoryRate) vitalsPayload.respiratoryRate = Number(vitals.respiratoryRate);
      if (vitals.oxygenSaturation) vitalsPayload.oxygenSaturation = Number(vitals.oxygenSaturation);
      if (vitals.systolicBP) vitalsPayload.systolicBP = Number(vitals.systolicBP);
      if (vitals.diastolicBP) vitalsPayload.diastolicBP = Number(vitals.diastolicBP);
      if (vitals.temperature) vitalsPayload.temperature = Number(vitals.temperature);

      const result = await pushVitalReading(ambulanceId, createdPatientId, vitalsPayload as any);

      if (result?.deteriorationRisk) {
        setDeteriorationRisk(result.deteriorationRisk as any);
      }

      setStep('done');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message ?? 'Failed to submit vitals.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    const map: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#f59e0b',
      LOW: '#22c55e',
    };
    return map[level] ?? '#94a3b8';
  };

  if (step === 'done') {
    return (
      <View style={styles.container}>
        <View style={styles.doneCard}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneTitle}>Patient Registered</Text>
          <Text style={styles.doneId}>
            Patient ID: {createdPatientId?.slice(0, 8)}...
          </Text>

          {deteriorationRisk && (
            <View
              style={[
                styles.riskCard,
                { borderColor: getRiskColor(deteriorationRisk.risk_level) },
              ]}
            >
              <Text style={styles.riskLabel}>Deterioration Risk</Text>
              <Text
                style={[styles.riskLevel, { color: getRiskColor(deteriorationRisk.risk_level) }]}
              >
                {deteriorationRisk.risk_level} ({Math.round(deteriorationRisk.risk_score * 100)}%)
              </Text>
              {deteriorationRisk.contributing_features.length > 0 && (
                <Text style={styles.riskFeatures}>
                  ⚠ {deteriorationRisk.contributing_features.join(', ')}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setStep('patient');
              setCreatedPatientId(null);
              setDeteriorationRisk(null);
              setPatient({ name: '', age: '', sex: '', bloodGroup: '', chiefComplaint: '', emergencyNotes: '' });
              setVitals({ heartRate: '', respiratoryRate: '', oxygenSaturation: '', systolicBP: '', diastolicBP: '', temperature: '', consciousness: 'ALERT' });
            }}
          >
            <Text style={styles.resetBtnText}>Register Another Patient</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>
          {step === 'patient' ? '🧑‍⚕️ Patient Intake' : '📊 Record Vitals'}
        </Text>

        {step === 'patient' && (
          <>
            <Field label="Full Name" value={patient.name} onChange={(v) => setPatient({ ...patient, name: v })} placeholder="Patient's name (if known)" />
            <Field label="Age" value={patient.age} onChange={(v) => setPatient({ ...patient, age: v })} placeholder="e.g. 45" keyboardType="numeric" />
            <Field label="Sex" value={patient.sex} onChange={(v) => setPatient({ ...patient, sex: v })} placeholder="MALE / FEMALE / OTHER" />
            <Field label="Blood Group" value={patient.bloodGroup} onChange={(v) => setPatient({ ...patient, bloodGroup: v })} placeholder="e.g. O+" />
            <Field label="Chief Complaint *" value={patient.chiefComplaint} onChange={(v) => setPatient({ ...patient, chiefComplaint: v })} placeholder="e.g. Chest pain, trauma, seizure..." multiline />
            <Field label="Emergency Notes" value={patient.emergencyNotes} onChange={(v) => setPatient({ ...patient, emergencyNotes: v })} placeholder="Known allergies, conditions, medications..." multiline />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleCreatePatient}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Patient & Emergency Case →</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'vitals' && (
          <>
            <Text style={styles.vitalsHint}>
              Vitals are optional but improve AI risk classification. Add what's available.
            </Text>
            <Field label="Heart Rate (bpm)" value={vitals.heartRate} onChange={(v) => setVitals({ ...vitals, heartRate: v })} keyboardType="numeric" placeholder="e.g. 95" />
            <Field label="Respiratory Rate (/min)" value={vitals.respiratoryRate} onChange={(v) => setVitals({ ...vitals, respiratoryRate: v })} keyboardType="numeric" placeholder="e.g. 20" />
            <Field label="SpO2 (%)" value={vitals.oxygenSaturation} onChange={(v) => setVitals({ ...vitals, oxygenSaturation: v })} keyboardType="numeric" placeholder="e.g. 95" />
            <Field label="Systolic BP (mmHg)" value={vitals.systolicBP} onChange={(v) => setVitals({ ...vitals, systolicBP: v })} keyboardType="numeric" placeholder="e.g. 120" />
            <Field label="Diastolic BP (mmHg)" value={vitals.diastolicBP} onChange={(v) => setVitals({ ...vitals, diastolicBP: v })} keyboardType="numeric" placeholder="e.g. 80" />
            <Field label="Temperature (°C)" value={vitals.temperature} onChange={(v) => setVitals({ ...vitals, temperature: v })} keyboardType="numeric" placeholder="e.g. 37.2" />
            <Field label="Consciousness" value={vitals.consciousness} onChange={(v) => setVitals({ ...vitals, consciousness: v })} placeholder="ALERT / VERBAL / PAIN / UNRESPONSIVE" />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmitVitals}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Vitals & Assess Risk →</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
  multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 12, color: '#f1f5f9', fontSize: 15 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  vitalsHint: { color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  btn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneCard: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  doneIcon: { fontSize: 64, marginBottom: 16 },
  doneTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  doneId: { color: '#475569', fontSize: 13, marginBottom: 24 },
  riskCard: { width: '100%', borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 24 },
  riskLabel: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', marginBottom: 6 },
  riskLevel: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  riskFeatures: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  resetBtn: { borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14 },
  resetBtnText: { color: '#94a3b8', fontWeight: '600' },
});
