export type UserRole =
  | 'PARAMEDIC'
  | 'HOSPITAL_ER'
  | 'HOSPITAL_ADMIN'
  | 'AMBULANCE_CONTROL'
  | 'STATE_COMMAND_CENTER'
  | 'SYSTEM_ADMIN'
  | 'ML_SERVICE';

export type EmergencyState =
  | 'CREATED'
  | 'ASSESSING'
  | 'SEARCHING_HOSPITAL'
  | 'HOSPITAL_REQUESTED'
  | 'HOSPITAL_ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type HospitalRequestState =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ReservationState =
  | 'ACTIVE'
  | 'CONSUMED'
  | 'RELEASED'
  | 'EXPIRED'
  | 'CANCELLED';

export type EmergencyPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type DeteriorationRiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type ResourceFreshnessStatus =
  | 'FRESH'
  | 'AGING'
  | 'STALE'
  | 'MISSING'
  | 'CONFLICTING';

export type WebSocketEventType =
  | 'EMERGENCY_CREATED'
  | 'EMERGENCY_STATUS_UPDATED'
  | 'HOSPITAL_REQUEST_CREATED'
  | 'HOSPITAL_REQUEST_ACCEPTED'
  | 'HOSPITAL_REQUEST_REJECTED'
  | 'HOSPITAL_RESOURCES_UPDATED'
  | 'AMBULANCE_LOCATION_UPDATED'
  | 'AMBULANCE_STATUS_UPDATED'
  | 'HOSPITAL_DESTINATION_CHANGED'
  | 'ALERT_CREATED';

export interface EventEnvelope<T = unknown> {
  event_id: string;
  event_type: WebSocketEventType;
  occurred_at: string;
  entity_type: string;
  entity_id: string;
  version: number;
  correlation_id: string;
  payload: T;
}

export interface CandidateExplanation {
  hospital_id: string;
  name: string;
  code: string;
  eligible: boolean;
  eta_minutes: number;
  distance_km: number;
  required_resources: Array<{
    type: string;
    required: number;
    available: number;
  }>;
  capability_match: number;
  capacity_confidence: number;
  freshness_seconds: number;
  freshness_status: ResourceFreshnessStatus;
  reason_codes: string[];
}
