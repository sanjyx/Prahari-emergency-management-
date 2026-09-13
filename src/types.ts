export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type Unsubscribe = () => void;

export interface Shelter {
  name: string;
  capacity: number;
  distanceKm: number;
  elevationM: number;
  route: string;
}

export interface Zone {
  id: string;
  name: string;
  district: string;
  state: string;
  elevationM: number;
  slopePct: number;
  baseRainfallMm: number;
  baseSoilMoisture: number;
  baseRiverLevel: number;
  riverDangerLevel: number;
  population: number;
  x: number;
  y: number;
  shelters: Shelter[];
}

export interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  raw: string;
  index: number;
  contribution: number;
  note: string;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  rainfall: number;
  soilMoisture: number;
  riverLevel: number;
  leadTimeMin: number;
}

export interface SensorNode {
  id: string;
  label: string;
  type: string;
  value: string;
  status: 'Online' | 'Degraded' | 'Offline';
  battery: number;
  lastPing: string;
  spark: number[];
}

export interface HistoryPoint {
  hour: string;
  rainfall: number;
  score: number;
}

export interface AlertItem {
  id: string;
  zoneId: string;
  zone: string;
  level: RiskLevel;
  message: string;
  issued: string;
  channel: string;
  status: 'Active' | 'Acknowledged' | 'Standby';
  createdBy?: string;
}

export type UserRole = 'citizen' | 'responder' | 'authority' | 'admin';

export interface LastKnownLocation {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  source?: 'gps' | 'network' | 'manual' | 'cached';
  zoneId?: string;
  zoneName?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  unit?: string;
  lastKnownLocation?: LastKnownLocation;
  isOnline?: boolean;
}

export type IncidentType =
  | 'flash_flood'
  | 'landslide'
  | 'river_burst'
  | 'road_block'
  | 'bridge_damage'
  | 'trapped_civilians'
  | 'medical_emergency';

export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical';

export type IncidentStatus =
  | 'reported'
  | 'investigating'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export interface Incident {
  id: string;
  title: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  zoneId: string;
  zoneName: string;
  location: {
    lat: number;
    lng: number;
    landmark?: string;
    mapX?: number;
    mapY?: number;
  };
  reportedBy: {
    uid: string;
    name: string;
    role: UserRole;
    contact?: string;
  };
  assignedTo?: {
    uid: string;
    name: string;
    unit?: string;
    phone?: string;
    assignedAt?: number;
  };
  createdAt: number;
  updatedAt: number;
  offlineQueued?: boolean;
  notes?: string[];
  aiTriageSummary?: string;
}

export type NetworkMode = 'online' | 'low_connectivity' | 'offline';

export interface OfflineAction {
  id: string;
  type: 'CREATE_INCIDENT' | 'UPDATE_INCIDENT_STATUS' | 'ASSIGN_RESPONDER' | 'SHARE_LOCATION';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export interface RouteNode {
  id: string;
  name: string;
  x: number; // 0-100 on schematic map
  y: number; // 0-92 on schematic map
  elevationM: number;
  type: 'zone' | 'shelter' | 'junction' | 'bridge' | 'checkpoint';
  zoneId?: string;
}

export interface RouteEdge {
  from: string;
  to: string;
  distanceKm: number;
  slopePct: number;
  isBridge?: boolean;
  isRiverAdjacent?: boolean;
  blocked?: boolean;
  blockReason?: string;
}

export interface AStarPathResult {
  nodes: RouteNode[];
  edges: RouteEdge[];
  totalDistanceKm: number;
  estimatedTimeMin: number;
  overallRisk: RiskLevel;
  pathFound: boolean;
  hazardWarnings: string[];
  avoidedCount: number;
}
