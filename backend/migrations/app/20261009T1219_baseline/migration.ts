#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3bf3d3e2582a0fbb153eb13c8cd4264b4f93e5c6b72a807d63e55798d278f1cb/contract';
import endContract from '../../snapshots/3bf3d3e2582a0fbb153eb13c8cd4264b4f93e5c6b72a807d63e55798d278f1cb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Ambulance',
        columns: [
          col('ambulanceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('crewDetails', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('equipmentSummary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastUpdated', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('registrationNo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['ambulanceId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuditEvent',
        columns: [
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('actorType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('auditEventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('details', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('emergencyCaseId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('occurredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['auditEventId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'EmergencyCase',
        columns: [
          col('ambulanceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('chiefComplaint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currentLatitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('currentLongitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('destinationHospitalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('emergencyCaseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('patientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priority', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requiredResources', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('riskLevel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('state', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['emergencyCaseId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Hospital',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('emergencyContact', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('hospitalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('latitude', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['hospitalId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'HospitalCapability',
        columns: [
          col('capabilityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('capabilityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('enabled', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('hospitalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastUpdated', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['capabilityId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'HospitalRequest',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('emergencyCaseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hospitalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hospitalRequestId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('requestedResources', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('respondedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['hospitalRequestId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'HospitalResource',
        columns: [
          col('available', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('hospitalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastUpdated', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('maintenance', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('occupied', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reserved', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['resourceId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ModelInference',
        columns: [
          col('confidence', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('emergencyCaseId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('inferenceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inputSummary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('modelName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modelVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('outputSummary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reasonCodes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['inferenceId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Patient',
        columns: [
          col('age', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('bloodGroup', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('emergencyNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('patientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sex', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['patientId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Reservation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('emergencyCaseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('hospitalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hospitalRequestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reservationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reservedResources', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['reservationId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'VitalReading',
        columns: [
          col('consciousness', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('diastolicBP', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('heartRate', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('oxygenSaturation', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('patientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recordedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('respiratoryRate', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('systolicBP', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('temperature', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('vitalReadingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['vitalReadingId'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Ambulance',
        constraint: 'Ambulance_registrationNo_key',
        columns: ['registrationNo'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Hospital',
        constraint: 'Hospital_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Reservation',
        constraint: 'Reservation_hospitalRequestId_key',
        columns: ['hospitalRequestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditEvent',
        index: 'AuditEvent_emergencyCaseId_idx_1fa65c28',
        columns: ['emergencyCaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmergencyCase',
        index: 'EmergencyCase_ambulanceId_idx_77f531f9',
        columns: ['ambulanceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmergencyCase',
        index: 'EmergencyCase_destinationHospitalId_idx_26134519',
        columns: ['destinationHospitalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmergencyCase',
        index: 'EmergencyCase_patientId_idx_e5f07e88',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HospitalCapability',
        index: 'HospitalCapability_hospitalId_idx_94de2e98',
        columns: ['hospitalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HospitalRequest',
        index: 'HospitalRequest_emergencyCaseId_idx_1fa65c28',
        columns: ['emergencyCaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HospitalRequest',
        index: 'HospitalRequest_hospitalId_idx_94de2e98',
        columns: ['hospitalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HospitalResource',
        index: 'HospitalResource_hospitalId_idx_94de2e98',
        columns: ['hospitalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ModelInference',
        index: 'ModelInference_emergencyCaseId_idx_1fa65c28',
        columns: ['emergencyCaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Reservation',
        index: 'Reservation_emergencyCaseId_idx_1fa65c28',
        columns: ['emergencyCaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Reservation',
        index: 'Reservation_hospitalId_idx_94de2e98',
        columns: ['hospitalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'VitalReading',
        index: 'VitalReading_patientId_idx_e5f07e88',
        columns: ['patientId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuditEvent',
        foreignKey: {
          name: 'AuditEvent_emergencyCaseId_fkey',
          columns: ['emergencyCaseId'],
          references: { schema: 'public', table: 'EmergencyCase', columns: ['emergencyCaseId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmergencyCase',
        foreignKey: {
          name: 'EmergencyCase_destinationHospitalId_fkey',
          columns: ['destinationHospitalId'],
          references: { schema: 'public', table: 'Hospital', columns: ['hospitalId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmergencyCase',
        foreignKey: {
          name: 'EmergencyCase_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'Patient', columns: ['patientId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmergencyCase',
        foreignKey: {
          name: 'EmergencyCase_ambulanceId_fkey',
          columns: ['ambulanceId'],
          references: { schema: 'public', table: 'Ambulance', columns: ['ambulanceId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HospitalCapability',
        foreignKey: {
          name: 'HospitalCapability_hospitalId_fkey',
          columns: ['hospitalId'],
          references: { schema: 'public', table: 'Hospital', columns: ['hospitalId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HospitalRequest',
        foreignKey: {
          name: 'HospitalRequest_emergencyCaseId_fkey',
          columns: ['emergencyCaseId'],
          references: { schema: 'public', table: 'EmergencyCase', columns: ['emergencyCaseId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HospitalRequest',
        foreignKey: {
          name: 'HospitalRequest_hospitalId_fkey',
          columns: ['hospitalId'],
          references: { schema: 'public', table: 'Hospital', columns: ['hospitalId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HospitalResource',
        foreignKey: {
          name: 'HospitalResource_hospitalId_fkey',
          columns: ['hospitalId'],
          references: { schema: 'public', table: 'Hospital', columns: ['hospitalId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ModelInference',
        foreignKey: {
          name: 'ModelInference_emergencyCaseId_fkey',
          columns: ['emergencyCaseId'],
          references: { schema: 'public', table: 'EmergencyCase', columns: ['emergencyCaseId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Reservation',
        foreignKey: {
          name: 'Reservation_emergencyCaseId_fkey',
          columns: ['emergencyCaseId'],
          references: { schema: 'public', table: 'EmergencyCase', columns: ['emergencyCaseId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Reservation',
        foreignKey: {
          name: 'Reservation_hospitalId_fkey',
          columns: ['hospitalId'],
          references: { schema: 'public', table: 'Hospital', columns: ['hospitalId'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Reservation',
        foreignKey: {
          name: 'Reservation_hospitalRequestId_fkey',
          columns: ['hospitalRequestId'],
          references: {
            schema: 'public',
            table: 'HospitalRequest',
            columns: ['hospitalRequestId'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'VitalReading',
        foreignKey: {
          name: 'VitalReading_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'Patient', columns: ['patientId'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
