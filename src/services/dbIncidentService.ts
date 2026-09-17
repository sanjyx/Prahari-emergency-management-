/**
 * PRAHARI Database Incident Service
 * Team: HYDRAX
 * 
 * Interacts with the backend API (/api/incidents) and Supabase database.
 * Supports polling / realtime listener to ensure newly submitted incidents
 * appear immediately on the authority dashboard.
 */

export interface DbIncident {
  id: string;
  incident_id: string;
  created_at: string;
  reporter_name?: string;
  reporter_contact?: string;
  transcription: string;
  incident_type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  latitude: number;
  longitude: number;
  location_name: string;
  status: 'NEW' | 'PROCESSING' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'RESOLVED';
  assigned_responder_id?: string | null;
  assigned_responder_name?: string | null;
  assigned_at?: string | null;
  source: 'VOICE' | 'MANUAL';
  audio_url?: string | null;
  notes?: string;
  demo_mode: boolean;
}

export interface DemoResponder {
  id: string;
  name: string;
  unit: string;
  phone: string;
}

export const PREDEFINED_DEMO_RESPONDERS: DemoResponder[] = [
  { id: 'RSP-001', name: 'Rapid Response Team A', unit: 'SDRF High-Altitude Quick Reaction', phone: '+91 98765 11001' },
  { id: 'RSP-002', name: 'Hill Rescue Unit', unit: 'NDRF / ITBP Alpine Rescue Bravo', phone: '+91 98765 11002' },
  { id: 'RSP-003', name: 'District Emergency Team', unit: 'DDMA Inter-Agency Operations', phone: '+91 98765 11003' },
  { id: 'RSP-004', name: 'Medical Response Unit', unit: 'Hilly Trauma Ambulance Unit 108', phone: '+91 98765 11004' }
];

export interface ClassificationResult {
  incidentType: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: 'High' | 'Needs verification';
  matchedKeywords: string[];
  explanation: string;
}

/**
 * Transparent keyword & rule-based incident understanding.
 * Not claimed as a trained model, clearly labeled as AI-assisted rule classification.
 */
export function classifyIncidentTranscript(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  const matchedKeywords: string[] = [];
  let incidentType = 'Flash Flood';
  let severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
  let confidence: 'High' | 'Needs verification' = 'High';
  let explanation = 'Standard catchment hydrological observation.';

  // Critical checks first
  if (
    lower.includes('trapped') ||
    lower.includes('stranded') ||
    lower.includes('swept away') ||
    lower.includes('people are trapped') ||
    lower.includes('submerged house') ||
    lower.includes('casualty') ||
    lower.includes('collapsed')
  ) {
    severity = 'CRITICAL';
    incidentType = lower.includes('landslide') ? 'Landslide' : 'Other Emergency';
    matchedKeywords.push('people trapped / critical hazard');
    explanation = 'Life-threatening condition detected: civilian entrapment / structural collapse.';
  } else if (
    lower.includes('landslide') ||
    lower.includes('mudslide') ||
    lower.includes('rockfall') ||
    lower.includes('debris')
  ) {
    incidentType = 'Landslide';
    severity = lower.includes('blocking') || lower.includes('road') ? 'HIGH' : 'MODERATE';
    matchedKeywords.push('landslide / slope failure');
    explanation = 'Slope failure or debris flow obstructing movement or habitation.';
  } else if (
    lower.includes('road completely covered') ||
    lower.includes('road blocked') ||
    lower.includes('blocking the road') ||
    lower.includes('bridge submerged') ||
    lower.includes('bridge damaged')
  ) {
    incidentType = 'Road Blockage';
    severity = 'HIGH';
    matchedKeywords.push('road blockage / transport cut-off');
    explanation = 'Crucial transit artery or bridge severed by water ingress or debris.';
  } else if (
    lower.includes('water is rising rapidly') ||
    lower.includes('rising rapidly') ||
    lower.includes('river surging') ||
    lower.includes('burst') ||
    lower.includes('overflowing') ||
    lower.includes('cloudburst')
  ) {
    incidentType = 'Rising Water';
    severity = 'HIGH';
    matchedKeywords.push('rapid water level rise');
    explanation = 'Acute hydrological surge indicating imminent flash flood inundation.';
  } else if (
    lower.includes('minor waterlogging') ||
    lower.includes('waterlogging') ||
    lower.includes('slow traffic') ||
    lower.includes('puddles')
  ) {
    incidentType = 'Flash Flood';
    severity = 'MODERATE';
    matchedKeywords.push('waterlogging');
    explanation = 'Localized surface drainage saturation without structural inundation.';
  } else if (
    lower.includes('bridge') ||
    lower.includes('culvert') ||
    lower.includes('electric pole') ||
    lower.includes('transformer')
  ) {
    incidentType = 'Infrastructure Damage';
    severity = 'HIGH';
    matchedKeywords.push('infrastructure');
    explanation = 'Damage to regional lifeline structures.';
  } else {
    // General check
    if (lower.includes('flood') || lower.includes('water') || lower.includes('rain')) {
      incidentType = 'Flash Flood';
      severity = 'HIGH';
      matchedKeywords.push('general flood indicator');
      confidence = 'Needs verification';
      explanation = 'General hydrological hazard reported; parameters require field verification.';
    } else {
      incidentType = 'Other Emergency';
      severity = 'LOW';
      confidence = 'Needs verification';
      matchedKeywords.push('unclassified emergency');
      explanation = 'Unclassified citizen report; dispatched to manual verification queue.';
    }
  }

  return {
    incidentType,
    severity,
    confidence,
    matchedKeywords,
    explanation
  };
}

/**
 * Determine best demo responder based on incident severity, type, or round-robin
 */
export function selectDemoResponder(incidentType: string, severity: string, indexOffset = 0): DemoResponder {
  if (severity === 'CRITICAL') {
    return PREDEFINED_DEMO_RESPONDERS[1]; // Hill Rescue Unit (Alpine Rescue Bravo)
  }
  if (incidentType === 'Landslide' || incidentType === 'Road Blockage') {
    return PREDEFINED_DEMO_RESPONDERS[0]; // Rapid Response Team A
  }
  if (incidentType === 'Infrastructure Damage') {
    return PREDEFINED_DEMO_RESPONDERS[2]; // District Emergency Team
  }
  // Round-robin selection
  const idx = Math.abs(indexOffset) % PREDEFINED_DEMO_RESPONDERS.length;
  return PREDEFINED_DEMO_RESPONDERS[idx];
}

class DbIncidentService {
  private listeners = new Set<(incidents: DbIncident[]) => void>();
  private pollInterval: any = null;
  private cachedIncidents: DbIncident[] = [];

  constructor() {
    this.startPolling();
  }

  private async fetchIncidentsFromApi(): Promise<DbIncident[]> {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.incidents)) {
          this.cachedIncidents = json.incidents;
          this.notifyListeners();
          return json.incidents;
        }
      }
    } catch (e) {
      console.warn('DbIncidentService: /api/incidents polling error:', e);
    }
    return this.cachedIncidents;
  }

  public startPolling(ms = 4000) {
    if (this.pollInterval) return;
    this.fetchIncidentsFromApi();
    this.pollInterval = setInterval(() => {
      this.fetchIncidentsFromApi();
    }, ms);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public subscribe(callback: (incidents: DbIncident[]) => void): () => void {
    this.listeners.add(callback);
    // Immediately supply cache
    if (this.cachedIncidents.length > 0) {
      callback(this.cachedIncidents);
    } else {
      this.fetchIncidentsFromApi().then((data) => callback(data));
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.cachedIncidents);
      } catch (err) {
        console.error('DbIncidentService listener error:', err);
      }
    }
  }

  public async getIncidents(): Promise<DbIncident[]> {
    return await this.fetchIncidentsFromApi();
  }

  public async createIncident(data: Partial<DbIncident>): Promise<DbIncident> {
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.success || !json.incident) {
        throw new Error(json.error || 'Failed to save incident');
      }

      const created: DbIncident = json.incident;
      this.cachedIncidents = [created, ...this.cachedIncidents.filter((i) => i.id !== created.id)];
      this.notifyListeners();
      return created;
    } catch (err) {
      console.error('DbIncidentService create incident error:', err);
      // Fallback local memory object to keep UX responsive
      const fallbackId = `PRH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const localFallback: DbIncident = {
        id: `inc-local-${Date.now()}`,
        incident_id: fallbackId,
        created_at: new Date().toISOString(),
        reporter_name: data.reporter_name || 'Anonymous Citizen',
        reporter_contact: data.reporter_contact || '',
        transcription: data.transcription || 'Emergency report',
        incident_type: data.incident_type || 'Flash Flood',
        severity: data.severity || 'HIGH',
        latitude: data.latitude || 30.408,
        longitude: data.longitude || 79.325,
        location_name: data.location_name || 'Chamoli Catchment',
        status: data.status || 'NEW',
        assigned_responder_id: data.assigned_responder_id || null,
        assigned_responder_name: data.assigned_responder_name || null,
        assigned_at: data.assigned_at || null,
        source: data.source || 'VOICE',
        notes: data.notes || '',
        demo_mode: data.demo_mode !== undefined ? data.demo_mode : true
      };
      this.cachedIncidents = [localFallback, ...this.cachedIncidents];
      this.notifyListeners();
      return localFallback;
    }
  }

  public async updateIncidentStatus(
    incidentId: string,
    status: DbIncident['status'],
    notes?: string
  ): Promise<DbIncident | null> {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.incident) {
          this.cachedIncidents = this.cachedIncidents.map((i) =>
            i.id === incidentId || i.incident_id === incidentId ? json.incident : i
          );
          this.notifyListeners();
          return json.incident;
        }
      }
    } catch (err) {
      console.warn('DbIncidentService update status error:', err);
    }

    // Local fallback update
    this.cachedIncidents = this.cachedIncidents.map((i) => {
      if (i.id === incidentId || i.incident_id === incidentId) {
        return { ...i, status, notes: notes || i.notes };
      }
      return i;
    });
    this.notifyListeners();
    return this.cachedIncidents.find((i) => i.id === incidentId || i.incident_id === incidentId) || null;
  }

  public async assignResponder(
    incidentId: string,
    responder: { id: string; name: string }
  ): Promise<DbIncident | null> {
    const assigned_at = new Date().toISOString();
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ASSIGNED',
          assigned_responder_id: responder.id,
          assigned_responder_name: responder.name,
          assigned_at
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.incident) {
          this.cachedIncidents = this.cachedIncidents.map((i) =>
            i.id === incidentId || i.incident_id === incidentId ? json.incident : i
          );
          this.notifyListeners();
          return json.incident;
        }
      }
    } catch (err) {
      console.warn('DbIncidentService assign responder error:', err);
    }

    // Local update
    this.cachedIncidents = this.cachedIncidents.map((i) => {
      if (i.id === incidentId || i.incident_id === incidentId) {
        return {
          ...i,
          status: 'ASSIGNED',
          assigned_responder_id: responder.id,
          assigned_responder_name: responder.name,
          assigned_at
        };
      }
      return i;
    });
    this.notifyListeners();
    return this.cachedIncidents.find((i) => i.id === incidentId || i.incident_id === incidentId) || null;
  }
}

export const dbIncidentService = new DbIncidentService();
