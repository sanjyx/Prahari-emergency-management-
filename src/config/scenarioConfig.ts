import { IncidentSeverity, IncidentType, RiskLevel, ScenarioStage, SystemStatus } from '../types';

export interface ScenarioMilestone {
  id: string;
  timeSeconds: number; // relative second mark (e.g. 0, 20, 40, 60, 80, 90, 105, 120)
  stage: ScenarioStage;
  systemStatus: SystemStatus;
  label: string;
  description: string;
  eventFeedTitle: string;
  eventFeedType: 'info' | 'warning' | 'critical' | 'success' | 'action';

  // Zone & Risk parameters
  zoneId: string; // Target zone (e.g. 'chamoli' or Zone A)
  zoneName: string;
  rainMultiplier: number;
  simulatedMetrics?: {
    rainfallMm: number;
    soilMoisturePct: number;
    riverLevelStr: string;
    slopeRiskPct: number;
    overallRiskScore: number;
    riskLevel: RiskLevel;
  };

  // Actions triggered at this milestone
  triggerAlert?: {
    title: string;
    message: string;
    level: RiskLevel;
  };
  triggerIncident?: {
    title: string;
    type: IncidentType;
    severity: IncidentSeverity;
    landmark: string;
    description: string;
  };
  triggerVoiceDemo?: {
    transcript: string;
    extracted: {
      incidentType: IncidentType;
      severity: IncidentSeverity;
      roadBlocked: boolean;
      peopleAtRisk: boolean;
      landmark: string;
    };
  };
  triggerConnectivity?: {
    mode: 'low_connectivity' | 'offline';
    lastKnownLocation: {
      statusText: string;
      coordinates: string;
      cachedAgo: string;
    };
  };
  triggerRoadBlock?: {
    edgeId: string;
    roadName: string;
    blockReason: string;
    destinationShelter: string;
  };
  triggerResponderDispatch?: {
    responderName: string;
    unit: string;
    countdownSeconds: number;
    status: 'EN ROUTE';
  };
  triggerAiSummary?: {
    headline: string;
    summaryText: string;
    recommendedAction: string;
  };
}

export interface EmergencyScenarioConfig {
  scenarioId: string;
  title: string;
  region: string;
  hazardType: string;
  speedOptions: number[]; // e.g. [1, 2, 5]
  defaultSpeed: number;
  totalDurationSeconds: number;
  milestones: ScenarioMilestone[];
}

/**
 * SINGLE CENTRAL CONFIGURATION FOR EMERGENCY SCENARIO MODE
 * All milestone timings, thresholds, and simulation outputs are defined here.
 */
export const DEFAULT_SCENARIO_CONFIG: EmergencyScenarioConfig = {
  scenarioId: 'scen-flash-flood-2026',
  title: 'Flash Flood & Landslide Cascade — Hilly Catchment Sector A',
  region: 'Alaknanda Upper Watershed (Chamoli Sector A)',
  hazardType: 'Flash Flood / River Breach',
  speedOptions: [1, 2, 5],
  defaultSpeed: 1,
  totalDurationSeconds: 130, // 2m 10s full cycle
  milestones: [
    {
      id: 'step-0-start',
      timeSeconds: 0,
      stage: 'DETECT',
      systemStatus: 'NORMAL',
      label: 'Scenario Initialized — Baseline Monitoring',
      description: 'Watershed monitoring online. Meteorological telemetry indicates seasonal baseline conditions.',
      eventFeedTitle: 'Scenario started — Baseline environmental telemetry verified',
      eventFeedType: 'info',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 1.0,
      simulatedMetrics: {
        rainfallMm: 18,
        soilMoisturePct: 38,
        riverLevelStr: 'Normal (1.8m)',
        slopeRiskPct: 22,
        overallRiskScore: 28,
        riskLevel: 'Low'
      }
    },
    {
      id: 'step-1-heavy-rainfall',
      timeSeconds: 20,
      stage: 'ASSESS',
      systemStatus: 'CRITICAL',
      label: 'Heavy Cloudburst Inflow Detected',
      description: 'Station RG-04 records sudden cloudburst precipitation (92 mm/hr). River discharge surge imminent.',
      eventFeedTitle: 'Heavy cloudburst rainfall detected in Zone A (92 mm/hr)',
      eventFeedType: 'critical',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.2,
      simulatedMetrics: {
        rainfallMm: 92,
        soilMoisturePct: 81,
        riverLevelStr: 'Rapidly Rising (+2.8m)',
        slopeRiskPct: 67,
        overallRiskScore: 78,
        riskLevel: 'Critical'
      },
      triggerAlert: {
        title: '🚨 CRITICAL FLASH FLOOD ALERT',
        message: 'Zone A requires immediate attention. Ultrasonic sensors detect 2.8m river level surge with 81% soil saturation.',
        level: 'Critical'
      }
    },
    {
      id: 'step-2-incident-created',
      timeSeconds: 40,
      stage: 'ASSESS',
      systemStatus: 'CRITICAL',
      label: 'Flash Flood Breach Incident Logged',
      description: 'Automated hydrologic trigger registers riverbank overflow in Zone A lower residential catchment.',
      eventFeedTitle: 'Critical flash flood incident created (Zone A - Unassigned)',
      eventFeedType: 'critical',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.5,
      simulatedMetrics: {
        rainfallMm: 96,
        soilMoisturePct: 84,
        riverLevelStr: 'Critical Surge (+3.2m)',
        slopeRiskPct: 71,
        overallRiskScore: 82,
        riskLevel: 'Critical'
      },
      triggerIncident: {
        title: 'Flash Flood & River Inundation',
        type: 'flash_flood',
        severity: 'critical',
        landmark: 'Zone A Lowland Settlement & Alaknanda Riverbank',
        description: 'Rapid river overflow inundating valley homes. Water depth exceeding 1.2m across primary access corridor.'
      }
    },
    {
      id: 'step-3-voice-report',
      timeSeconds: 60,
      stage: 'REPORT',
      systemStatus: 'CRITICAL',
      label: 'Citizen Voice Emergency Report',
      description: 'Hands-free voice emergency transmission received and parsed via NLP speech extraction.',
      eventFeedTitle: 'Voice emergency report transcribed and parsed into verified SOS',
      eventFeedType: 'action',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.5,
      triggerVoiceDemo: {
        transcript: 'Water is entering our village and the road near the bridge is blocked. We need help.',
        extracted: {
          incidentType: 'flash_flood',
          severity: 'critical',
          roadBlocked: true,
          peopleAtRisk: true,
          landmark: 'Village Bridge Approach (Zone A)'
        }
      }
    },
    {
      id: 'step-4-lkl-low-connectivity',
      timeSeconds: 80,
      stage: 'LOCATE',
      systemStatus: 'CRITICAL',
      label: 'Low Connectivity & Last-Known Location',
      description: 'Valley cell tower drops. System switches to low-connectivity mode while retaining verified GPS fix.',
      eventFeedTitle: 'Device offline in mountain valley — Last-Known Location retrieved from cache',
      eventFeedType: 'warning',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.6,
      triggerConnectivity: {
        mode: 'low_connectivity',
        lastKnownLocation: {
          statusText: 'Device offline (Cellular Link Lost)',
          coordinates: '30.4150° N, 79.3320° E',
          cachedAgo: 'Cached 2m ago (±15m accuracy)'
        }
      }
    },
    {
      id: 'step-5-blocked-road-routing',
      timeSeconds: 92,
      stage: 'LOCATE',
      systemStatus: 'CRITICAL',
      label: 'Road Corridor Severed — A* Pathfinder Recalculation',
      description: 'Primary bridge approach blocked by debris. Multi-factor A* algorithm re-routes to high-ground refuge.',
      eventFeedTitle: 'Road blocked at Valley Bridge ❌ — A* pathfinder routed safe alternative ✓',
      eventFeedType: 'warning',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.6,
      triggerRoadBlock: {
        edgeId: 'e-chamoli-bridge',
        roadName: 'Valley Bridge Sector Road (NH-58 Link)',
        blockReason: 'Bridge approach submerged under 1.4m torrent and debris boulders',
        destinationShelter: 'Gopeshwar High-Ground Community Shelter (Capacity: 350)'
      }
    },
    {
      id: 'step-6-responder-assigned',
      timeSeconds: 105,
      stage: 'RESPOND',
      systemStatus: 'CRITICAL',
      label: '5-Second Automatic Tactical Dispatch',
      description: 'Triage engine matches closest certified mountain rescue unit with all-terrain equipment.',
      eventFeedTitle: 'Responder 01 assigned (SDRF Quick Response Unit) — En route to Zone A',
      eventFeedType: 'success',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.4,
      triggerResponderDispatch: {
        responderName: 'Responder 01 (Capt. Vikram Negi)',
        unit: 'SDRF Quick Response Unit 3 (Chamoli)',
        countdownSeconds: 5,
        status: 'EN ROUTE'
      }
    },
    {
      id: 'step-7-ai-summary',
      timeSeconds: 120,
      stage: 'RESPOND',
      systemStatus: 'CRITICAL',
      label: 'AI Disaster Situation Summary Synthesized',
      description: 'Autonomous control room briefing compiles all sensor data, voice reports, road blocks, and units.',
      eventFeedTitle: 'AI situation summary synthesized with tactical evacuation priorities',
      eventFeedType: 'action',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Sector A',
      rainMultiplier: 3.4,
      triggerAiSummary: {
        headline: 'Critical Flash Flood & Evacuation Priority — Sector A',
        summaryText:
          'Critical flash-flood conditions have been detected in Zone A following intense rainfall (92 mm/hr) and rising river levels (+3.2m). A citizen voice emergency report indicates residential flooding and a severed bridge approach. The user\'s last-known location remains cached and verified. An alternative A* evacuation route has been calculated to Gopeshwar High Shelter, and Responder 01 (SDRF Unit 3) has been dispatched en route.',
        recommendedAction: 'Prioritize immediate evacuation of 120+ residents in Sector A lowland corridor along the alternative high-ridge trail.'
      }
    }
  ]
};
